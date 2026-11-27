import { describe, expect, it } from 'vitest';
import type { TestCase } from '../../src/domain/types';
import { importTestCasesToZephyr, pickPriority } from '../../src/integrations/zephyr/zephyrImport';
import { ZephyrScaleAdapter, zephyrConfigFromEnv } from '../../src/integrations/zephyr/zephyrScale';

const tc = (key: string, name: string, extra: Partial<TestCase> = {}): TestCase => ({
  key,
  name,
  objective: name,
  component: 'Checkout',
  priority: 'Critical',
  businessCritical: true,
  steps: [{ index: 1, action: 'Navigate to /cart', expected: 'Cart shows "1 item"' }],
  automationScript: 'automation-scripts/cart.spec.ts',
  playwrightRevalidationApproved: true,
  labels: [],
  ...extra,
});

/** In-memory Zephyr Scale Cloud: enough of /testcases, /teststeps, /priorities and /folders for the importer and adapter. */
function fakeZephyr(existing: { key: string; name: string }[] = []) {
  const cases = new Map<string, Record<string, unknown>>(existing.map((c) => [c.key, { ...c, labels: [], priority: { id: 2 } }]));
  const steps = new Map<string, unknown[]>();
  const posts: { path: string; body: any }[] = [];
  const priorities = [{ id: 1, name: 'High' }, { id: 2, name: 'Normal' }, { id: 3, name: 'Low' }];
  let next = 100;
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
  const impl = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const p = url.pathname.replace(/^\/v2/, '');
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posts.push({ path: p, body });
      if (p === '/folders') return json({ id: 55 }, 201);
      if (p === '/testcases') {
        const key = `${body.projectKey}-T${next++}`;
        const prio = priorities.find((x) => x.name === body.priorityName) ?? priorities[1];
        cases.set(key, { ...body, key, priority: { id: prio.id } });
        return json({ id: next, key }, 201);
      }
      const m = /^\/testcases\/([^/]+)\/teststeps$/.exec(p);
      if (m) return steps.set(m[1], body.items), json({ id: 1 }, 201);
    }
    if (p === '/testcases') return json({ values: [...cases.values()], isLast: true });
    if (p === '/priorities') return json({ values: priorities, isLast: true });
    if (p === '/folders') return json({ values: [], isLast: true });
    const pr = /^\/priorities\/(\d+)$/.exec(p);
    if (pr) return json(priorities.find((x) => x.id === Number(pr[1])));
    const st = /^\/testcases\/([^/]+)\/teststeps$/.exec(p);
    if (st) return json({ values: steps.get(st[1]) ?? [], isLast: true });
    const one = /^\/testcases\/([^/]+)$/.exec(p);
    if (one && cases.has(one[1])) return json(cases.get(one[1]));
    return json({ message: 'not found' }, 404);
  }) as typeof fetch;
  return { impl, posts };
}

describe('importTestCasesToZephyr', () => {
  it('creates cases with steps in a folder, skips names that already exist, and round-trips through the live adapter', async () => {
    const z = fakeZephyr([{ key: 'SCRUM-T1', name: 'Already there' }]);
    const cfg = { ...zephyrConfigFromEnv({ ZEPHYR_API_TOKEN: 't' }), fetchImpl: z.impl };
    const res = await importTestCasesToZephyr([tc('DEMO-T1', 'Already there'), tc('DEMO-T5', 'Add to cart')], cfg, {
      projectKey: 'SCRUM',
      folderName: 'Failure Triage Demo',
    });

    expect(res).toEqual({ keyMap: { 'DEMO-T1': 'SCRUM-T1', 'DEMO-T5': 'SCRUM-T100' }, created: ['DEMO-T5'], skipped: ['DEMO-T1'] });
    expect(z.posts.map((p) => p.path)).toEqual(['/folders', '/testcases', '/testcases/SCRUM-T100/teststeps']);
    expect(z.posts[1].body).toMatchObject({
      projectKey: 'SCRUM',
      name: 'Add to cart',
      priorityName: 'High',
      folderId: 55,
      labels: ['component:Checkout', 'business-critical', 'playwright-revalidation'],
    });
    expect(z.posts[2].body).toEqual({ mode: 'OVERWRITE', items: [{ inline: { description: 'Navigate to /cart', expectedResult: 'Cart shows "1 item"' } }] });

    const [back] = await new ZephyrScaleAdapter(cfg).getTestCases(['SCRUM-T100']);
    expect(back).toMatchObject({
      key: 'SCRUM-T100',
      objective: 'Add to cart',
      component: 'Checkout',
      priority: 'High',
      businessCritical: true,
      playwrightRevalidationApproved: true,
      automationScript: 'automation-scripts/cart.spec.ts',
      steps: [{ index: 1, action: 'Navigate to /cart', expected: 'Cart shows "1 item"' }],
    });
  });

  it('makes no changes in dry-run mode', async () => {
    const z = fakeZephyr();
    const res = await importTestCasesToZephyr([tc('DEMO-T5', 'Add to cart')], { ...zephyrConfigFromEnv({ ZEPHYR_API_TOKEN: 't' }), fetchImpl: z.impl }, {
      projectKey: 'SCRUM',
      folderName: 'Failure Triage Demo',
      dryRun: true,
    });
    expect(z.posts).toEqual([]);
    expect(res.created).toEqual([]);
  });

  it('maps priorities onto what the project has', () => {
    expect(pickPriority('Critical', ['Critical', 'High'])).toBe('Critical');
    expect(pickPriority('Critical', ['High', 'Normal', 'Low'])).toBe('High');
    expect(pickPriority('Low', ['High', 'Normal', 'Low'])).toBe('Low');
    expect(pickPriority('Normal', [])).toBeUndefined();
  });
});
