import type { TestCase } from '../../domain/types';
import { HttpClient } from '../shared/http';
import type { ZephyrScaleConfig } from './zephyrScale';

export interface ZephyrImportOptions {
  projectKey: string;
  /** Root test-case folder to create the cases in (created if missing). */
  folderName?: string;
  dryRun?: boolean;
  log?: (msg: string) => void;
}

export interface ZephyrImportResult {
  /** Local key → Zephyr key, for every case that now exists in Zephyr. */
  keyMap: Record<string, string>;
  created: string[];
  skipped: string[];
}

interface Page<T> {
  values: T[];
  isLast?: boolean;
}

/**
 * Creates test cases (with steps) in Zephyr Scale Cloud. Idempotent: a case whose name already exists in the
 * project is skipped. Metadata goes into labels the live adapter reads back (`component:<name>`, the
 * business-critical and revalidation labels), so no Zephyr custom fields have to be configured.
 */
export async function importTestCasesToZephyr(
  cases: TestCase[],
  cfg: Pick<ZephyrScaleConfig, 'baseUrl' | 'apiToken' | 'businessCriticalLabel' | 'revalidationLabel' | 'fetchImpl'>,
  opts: ZephyrImportOptions,
): Promise<ZephyrImportResult> {
  const log = opts.log ?? (() => {});
  const http = new HttpClient({ baseUrl: cfg.baseUrl, headers: { Authorization: `Bearer ${cfg.apiToken}` }, fetchImpl: cfg.fetchImpl });
  const { projectKey } = opts;

  const existing = new Map<string, string>();
  for (const tc of await all<{ key: string; name: string }>(http, '/testcases', { projectKey })) existing.set(tc.name, tc.key);
  const priorities = (await all<{ name: string }>(http, '/priorities', { projectKey })).map((p) => p.name);
  const folderId = opts.folderName ? await ensureFolder(http, projectKey, opts.folderName, !!opts.dryRun, log) : undefined;

  const result: ZephyrImportResult = { keyMap: {}, created: [], skipped: [] };
  for (const tc of cases) {
    const found = existing.get(tc.name);
    if (found) {
      result.keyMap[tc.key] = found;
      result.skipped.push(tc.key);
      log(`${tc.key} → ${found} (already in Zephyr, skipped)`);
      continue;
    }
    const body = testCasePayload(tc, cfg, projectKey, pickPriority(tc.priority, priorities), folderId);
    if (opts.dryRun) {
      log(`[dry run] would create "${tc.name}" with ${tc.steps.length} steps, labels ${JSON.stringify(body.labels)}`);
      continue;
    }
    const { key } = await http.post<{ key: string }>('/testcases', body);
    if (tc.steps.length) await http.post(`/testcases/${encodeURIComponent(key)}/teststeps`, stepsPayload(tc));
    existing.set(tc.name, key);
    result.keyMap[tc.key] = key;
    result.created.push(tc.key);
    log(`${tc.key} → ${key} (created, ${tc.steps.length} steps)`);
  }
  return result;
}

export function testCasePayload(
  tc: TestCase,
  cfg: Pick<ZephyrScaleConfig, 'businessCriticalLabel' | 'revalidationLabel'>,
  projectKey: string,
  priorityName: string | undefined,
  folderId: number | undefined,
) {
  const labels = [...tc.labels];
  if (tc.component) labels.push(`component:${tc.component}`);
  if (tc.businessCritical) labels.push(cfg.businessCriticalLabel);
  if (tc.playwrightRevalidationApproved) labels.push(cfg.revalidationLabel);
  const objective = [tc.objective, tc.automationScript && `Automation script: ${tc.automationScript}`].filter(Boolean).join('<br>');
  return {
    projectKey,
    name: tc.name,
    objective,
    labels: [...new Set(labels)],
    ...(priorityName ? { priorityName } : {}),
    ...(folderId ? { folderId } : {}),
  };
}

export function stepsPayload(tc: TestCase) {
  return {
    mode: 'OVERWRITE',
    items: tc.steps.map((s) => ({ inline: { description: s.action, expectedResult: s.expected } })),
  };
}

/** Exact priority name if the project has it, otherwise the nearest default Zephyr priority (High/Normal/Low). */
export function pickPriority(priority: string, available: string[]): string | undefined {
  const find = (n: string) => available.find((a) => a.toLowerCase() === n.toLowerCase());
  return find(priority) ?? (priority === 'Critical' ? find('High') : undefined) ?? find('Normal');
}

async function ensureFolder(http: HttpClient, projectKey: string, name: string, dryRun: boolean, log: (m: string) => void): Promise<number | undefined> {
  const folders = await all<{ id: number; name: string; parentId: number | null }>(http, '/folders', { projectKey, folderType: 'TEST_CASE' });
  const hit = folders.find((f) => f.name === name && !f.parentId);
  if (hit) return hit.id;
  if (dryRun) {
    log(`[dry run] would create folder "${name}"`);
    return undefined;
  }
  const { id } = await http.post<{ id: number }>('/folders', { projectKey, name, folderType: 'TEST_CASE' });
  log(`Created folder "${name}"`);
  return id;
}

async function all<T>(http: HttpClient, path: string, query: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  for (let startAt = 0; ; ) {
    const page = await http.get<Page<T>>(path, { ...query, startAt, maxResults: 100 });
    out.push(...page.values);
    if (page.isLast !== false || !page.values.length) return out;
    startAt += page.values.length;
  }
}
