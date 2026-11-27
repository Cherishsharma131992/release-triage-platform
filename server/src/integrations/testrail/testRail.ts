import type { TestCase, TestStep } from '../../domain/types';
import type { HealthCheckResult, TestCaseManagementAdapter } from '../types';
import { HttpError, requireEnv } from '../shared/http';
import { normalizeZephyrPriority } from '../zephyr/zephyrScale';

export interface TestRailConfig {
  /** e.g. https://yourco.testrail.io */
  baseUrl: string;
  user: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export function testRailConfigFromEnv(env: NodeJS.ProcessEnv): TestRailConfig {
  return {
    baseUrl: requireEnv(env, 'TESTRAIL_URL').replace(/\/+$/, ''),
    user: requireEnv(env, 'TESTRAIL_USER'),
    apiKey: requireEnv(env, 'TESTRAIL_API_KEY'),
  };
}

type Params = Record<string, string | number | undefined>;

/** TestRail API v2 client. Endpoints live in the query string: `/index.php?/api/v2/get_case/1&x=y`. Auth: basic user + API key. */
export class TestRailClient {
  private readonly fetchImpl: typeof fetch;
  private readonly auth: string;

  constructor(private readonly cfg: TestRailConfig) {
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.auth = 'Basic ' + Buffer.from(`${cfg.user}:${cfg.apiKey}`).toString('base64');
  }

  get<T>(endpoint: string, params: Params = {}): Promise<T> {
    return this.request<T>('GET', endpoint, params);
  }

  post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, {}, body);
  }

  /** All items of a list endpoint; handles both paginated (`{ size, _links, <field>: [] }`) and bare-array responses. */
  async list<T>(endpoint: string, field: string, params: Params = {}): Promise<T[]> {
    const out: T[] = [];
    for (let offset = 0; ; ) {
      const page = await this.get<T[] | ({ size?: number; _links?: { next: string | null } } & Record<string, unknown>)>(endpoint, { ...params, limit: 250, offset });
      if (Array.isArray(page)) return out.concat(page);
      const items = (page[field] as T[] | undefined) ?? [];
      out.push(...items);
      if (!page._links?.next || !items.length) return out;
      offset += items.length;
    }
  }

  private async request<T>(method: string, endpoint: string, params: Params, body?: unknown): Promise<T> {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('');
    const url = `${this.cfg.baseUrl}/index.php?/api/v2/${endpoint}${qs}`;
    const where = `${method} ${this.cfg.baseUrl} ${endpoint}`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: this.auth },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      throw new Error(`${where} failed: ${(err as Error).message}`);
    }
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300);
      throw new HttpError(res.status, `${where} returned HTTP ${res.status}${text ? `: ${text}` : ''}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

export interface TestRailCase {
  id: number;
  title: string;
  section_id?: number;
  priority_id?: number;
  refs?: string | null;
  custom_preconds?: string | null;
  custom_steps?: string | null;
  custom_expected?: string | null;
  custom_steps_separated?: { content?: string | null; expected?: string | null }[] | null;
}

/**
 * Metadata lines in the case's Preconditions, written by `npm run testrail:import`, so no TestRail custom fields are needed:
 *   Component: Checkout / Business critical: yes / Playwright revalidation: approved / Automation script: automation-scripts/cart.spec.ts
 */
const META = /^(Component|Business critical|Playwright revalidation|Automation script):[ \t]*(.*)$/gim;
const YES = /^(yes|true|approved|1)$/i;

export function formatTestRailPreconds(tc: TestCase): string {
  return [
    tc.objective,
    '',
    `Component: ${tc.component}`,
    `Business critical: ${tc.businessCritical ? 'yes' : 'no'}`,
    `Playwright revalidation: ${tc.playwrightRevalidationApproved ? 'approved' : 'no'}`,
    `Automation script: ${tc.automationScript}`,
  ].join('\n');
}

export const testRailKey = (id: number) => `C${id}`;

export function mapTestRailCase(c: TestRailCase, priorityName: string | undefined): TestCase {
  const preconds = c.custom_preconds ?? '';
  const meta: Record<string, string> = {};
  for (const m of preconds.matchAll(META)) meta[m[1].toLowerCase()] = m[2].trim();
  const steps: TestStep[] = c.custom_steps_separated?.length
    ? c.custom_steps_separated.map((s, i) => ({ index: i + 1, action: (s.content ?? '').trim(), expected: (s.expected ?? '').trim() }))
    : (c.custom_steps ?? '')
        .split('\n')
        .map((l) => l.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean)
        .map((action, i, all) => ({ index: i + 1, action, expected: i === all.length - 1 ? (c.custom_expected ?? '').trim() : '' }));
  return {
    key: testRailKey(c.id),
    name: c.title,
    objective: preconds.replace(META, '').trim() || c.title,
    component: meta['component'] || 'Unassigned',
    priority: normalizeZephyrPriority(priorityName),
    businessCritical: YES.test(meta['business critical'] ?? ''),
    steps,
    automationScript: meta['automation script'] ?? '',
    playwrightRevalidationApproved: YES.test(meta['playwright revalidation'] ?? ''),
    labels: (c.refs ?? '').split(',').map((r) => r.trim()).filter(Boolean),
  };
}

/** TestRail Cloud/Server API v2. Test case keys are TestRail case IDs (`C123`). */
export class TestRailAdapter implements TestCaseManagementAdapter {
  readonly name = 'TestRail';
  readonly adapter = 'testrail';
  private readonly client: TestRailClient;
  private priorities?: Promise<Map<number, string>>;

  constructor(cfg: TestRailConfig) {
    this.client = new TestRailClient(cfg);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.client.get('get_projects', { limit: 1 });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  async getTestCases(keys: string[]): Promise<TestCase[]> {
    const out: TestCase[] = [];
    for (const key of [...new Set(keys)]) {
      const id = /^C?(\d+)$/i.exec(key)?.[1];
      if (!id) continue;
      try {
        const c = await this.client.get<TestRailCase>(`get_case/${id}`);
        out.push(mapTestRailCase(c, (await this.priorityNames()).get(c.priority_id ?? -1)));
      } catch (err) {
        // TestRail answers 400 for an unknown case id.
        if (err instanceof HttpError && (err.status === 400 || err.status === 404)) continue;
        throw err;
      }
    }
    return out;
  }

  private priorityNames(): Promise<Map<number, string>> {
    this.priorities ??= this.client
      .get<{ id: number; name: string }[]>('get_priorities')
      .then((ps) => new Map(ps.map((p) => [p.id, p.name])))
      .catch((err) => {
        this.priorities = undefined;
        throw err;
      });
    return this.priorities;
  }
}
