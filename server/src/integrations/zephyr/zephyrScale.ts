import type { TestCase, TestCasePriority, TestStep } from '../../domain/types';
import type { HealthCheckResult, TestCaseManagementAdapter } from '../types';
import { HttpClient, HttpError, requireEnv, stripHtml } from '../shared/http';

export interface ZephyrScaleConfig {
  baseUrl: string;
  apiToken: string;
  /** Custom field (by name) holding the automation script path. */
  scriptField: string;
  businessCriticalField: string;
  businessCriticalLabel: string;
  revalidationField: string;
  revalidationLabel: string;
  componentField: string;
  fetchImpl?: typeof fetch;
}

export function zephyrConfigFromEnv(env: NodeJS.ProcessEnv): ZephyrScaleConfig {
  return {
    baseUrl: env.ZEPHYR_BASE_URL ?? 'https://api.zephyrscale.smartbear.com/v2',
    apiToken: requireEnv(env, 'ZEPHYR_API_TOKEN'),
    scriptField: env.ZEPHYR_SCRIPT_FIELD ?? 'Automation Script',
    businessCriticalField: env.ZEPHYR_BUSINESS_CRITICAL_FIELD ?? 'Business Critical',
    businessCriticalLabel: env.ZEPHYR_BUSINESS_CRITICAL_LABEL ?? 'business-critical',
    revalidationField: env.ZEPHYR_REVALIDATION_FIELD ?? 'Playwright Revalidation',
    revalidationLabel: env.ZEPHYR_REVALIDATION_LABEL ?? 'playwright-revalidation',
    componentField: env.ZEPHYR_COMPONENT_FIELD ?? 'Component',
  };
}

interface Ref {
  id: number;
  self?: string;
}

interface ZephyrTestCase {
  key: string;
  name: string;
  objective?: string | null;
  priority?: Ref | null;
  component?: Ref | null;
  labels?: string[];
  customFields?: Record<string, unknown>;
}

interface ZephyrStepsPage {
  values: Array<{ inline?: { description?: string | null; expectedResult?: string | null; testData?: string | null } | null; testCase?: { testCaseKey?: string } | null }>;
  isLast?: boolean;
  startAt?: number;
  maxResults?: number;
}

const truthy = (v: unknown) => v === true || (typeof v === 'string' && /^(true|yes|y|1|approved)$/i.test(v.trim()));

export function normalizeZephyrPriority(name: string | undefined): TestCasePriority {
  const n = (name ?? '').toLowerCase();
  if (/critical|blocker|highest|p0|p1/.test(n)) return 'Critical';
  if (/high|major|p2/.test(n)) return 'High';
  if (/low|minor|trivial|p4/.test(n)) return 'Low';
  return 'Normal';
}

/** Zephyr Scale Cloud REST API v2. Auth: bearer API access token. */
export class ZephyrScaleAdapter implements TestCaseManagementAdapter {
  readonly name = 'Zephyr Scale';
  readonly adapter = 'zephyr-scale-cloud';
  private readonly http: HttpClient;
  private readonly priorityNames = new Map<number, string>();

  constructor(private readonly cfg: ZephyrScaleConfig) {
    this.http = new HttpClient({ baseUrl: cfg.baseUrl, headers: { Authorization: `Bearer ${cfg.apiToken}` }, fetchImpl: cfg.fetchImpl });
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.http.get('/projects', { maxResults: 1 });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  async getTestCases(keys: string[]): Promise<TestCase[]> {
    const out: TestCase[] = [];
    for (const key of [...new Set(keys)]) {
      try {
        out.push(await this.getTestCase(key));
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) continue;
        throw err;
      }
    }
    return out;
  }

  private async getTestCase(key: string): Promise<TestCase> {
    const tc = await this.http.get<ZephyrTestCase>(`/testcases/${encodeURIComponent(key)}`);
    const [steps, priority] = await Promise.all([this.getSteps(key), this.priorityName(tc.priority)]);
    const cf = tc.customFields ?? {};
    const labels = tc.labels ?? [];
    const component = cf[this.cfg.componentField];
    return {
      key: tc.key,
      name: tc.name,
      objective: stripHtml(tc.objective),
      component: typeof component === 'string' && component ? component : (labels.find((l) => l.startsWith('component:'))?.slice(10) ?? 'Unassigned'),
      priority: normalizeZephyrPriority(priority),
      businessCritical: truthy(cf[this.cfg.businessCriticalField]) || labels.includes(this.cfg.businessCriticalLabel),
      steps,
      automationScript: typeof cf[this.cfg.scriptField] === 'string' ? (cf[this.cfg.scriptField] as string) : '',
      playwrightRevalidationApproved: truthy(cf[this.cfg.revalidationField]) || labels.includes(this.cfg.revalidationLabel),
      labels,
    };
  }

  private async getSteps(key: string): Promise<TestStep[]> {
    const steps: TestStep[] = [];
    let startAt = 0;
    for (;;) {
      const page = await this.http.get<ZephyrStepsPage>(`/testcases/${encodeURIComponent(key)}/teststeps`, { startAt, maxResults: 100 });
      for (const v of page.values) {
        if (v.inline) {
          const data = stripHtml(v.inline.testData);
          steps.push({
            index: steps.length + 1,
            action: stripHtml(v.inline.description) + (data ? ` [data: ${data}]` : ''),
            expected: stripHtml(v.inline.expectedResult),
          });
        } else if (v.testCase?.testCaseKey) {
          steps.push({ index: steps.length + 1, action: `Call test case ${v.testCase.testCaseKey}`, expected: '' });
        }
      }
      if (page.isLast !== false || !page.values.length) break;
      startAt += page.values.length;
    }
    return steps;
  }

  private async priorityName(ref: Ref | null | undefined): Promise<string | undefined> {
    if (!ref) return undefined;
    if (!this.priorityNames.has(ref.id)) {
      const p = await this.http.get<{ name: string }>(`/priorities/${ref.id}`);
      this.priorityNames.set(ref.id, p.name);
    }
    return this.priorityNames.get(ref.id);
  }
}
