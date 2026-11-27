import { describe, expect, it } from 'vitest';
import type { TestCase } from '../../src/domain/types';
import { TestRailAdapter, mapTestRailCase } from '../../src/integrations/testrail/testRail';
import { importTestCasesToTestRail, pickTestRailPriority } from '../../src/integrations/testrail/testRailImport';

const tc = (key: string, name: string, extra: Partial<TestCase> = {}): TestCase => ({
  key,
  name,
  objective: name,
  component: 'Checkout',
  priority: 'Critical',
  businessCritical: true,
  steps: [
    { index: 1, action: 'Navigate to /cart', expected: '' },
    { index: 2, action: 'Click button "Pay"', expected: 'Shows "Thanks"' },
  ],
  automationScript: 'automation-scripts/checkout.spec.ts',
  playwrightRevalidationApproved: true,
  labels: [],
  ...extra,
});

/** In-memory TestRail API v2 (paginated list responses, like TestRail Cloud). */
function fakeTestRail(opts: { projects?: { id: number; name: string; suite_mode: number }[]; cases?: { id: number; title: string }[] } = {}) {
  const projects = [...(opts.projects ?? [])];
  const sections: { id: number; name: string; parent_id: number | null }[] = [];
  const cases = new Map<number, Record<string, unknown>>((opts.cases ?? []).map((c) => [c.id, { ...c, priority_id: 2 }]));
  const posts: { endpoint: string; body: any }[] = [];
  const auth: string[] = [];
  let next = 100;
  const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
  const page = (field: string, items: unknown[]) => ({ offset: 0, limit: 250, size: items.length, _links: { next: null, prev: null }, [field]: items });
  const impl = (async (input: string | URL, init?: RequestInit) => {
    auth.push(String((init?.headers as Record<string, string>).Authorization));
    const endpoint = String(input).split('?/api/v2/')[1].split('&')[0];
    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      posts.push({ endpoint, body });
      if (endpoint === 'add_project') return projects.push({ id: 7, name: body.name, suite_mode: 1 }), json(projects.at(-1));
      if (endpoint.startsWith('add_section/')) return sections.push({ id: next++, name: body.name, parent_id: body.parent_id ?? null }), json(sections.at(-1));
      if (endpoint.startsWith('add_case/')) {
        const id = next++;
        cases.set(id, { id, section_id: Number(endpoint.split('/')[1]), ...body });
        return json(cases.get(id));
      }
    }
    if (endpoint === 'get_projects') return json(page('projects', projects));
    if (endpoint.startsWith('get_cases/')) return json(page('cases', [...cases.values()]));
    if (endpoint.startsWith('get_sections/')) return json(page('sections', sections));
    if (endpoint === 'get_priorities') return json([{ id: 1, name: 'Low' }, { id: 2, name: 'Medium', is_default: true }, { id: 3, name: 'High' }, { id: 4, name: 'Critical' }]);
    if (endpoint === 'get_case_types') return json([{ id: 1, name: 'Other', is_default: true }, { id: 3, name: 'Automated' }]);
    if (endpoint.startsWith('get_templates/')) return json([{ id: 1, name: 'Test Case (Text)' }, { id: 2, name: 'Test Case (Steps)' }]);
    const one = /^get_case\/(\d+)$/.exec(endpoint);
    if (one) return cases.has(Number(one[1])) ? json(cases.get(Number(one[1]))) : json({ error: 'Field :case_id is not a valid test case.' }, 400);
    return json({ error: `unknown ${endpoint}` }, 400);
  }) as typeof fetch;
  return { impl, posts, auth };
}

const cfg = (impl: typeof fetch) => ({ baseUrl: 'https://acme.testrail.io', user: 'qa@acme.test', apiKey: 'k', fetchImpl: impl });

describe('TestRail', () => {
  it('imports into a new project with component sections, skips existing titles on re-run, and round-trips through the adapter', async () => {
    const t = fakeTestRail();
    const cases = [tc('DEMO-T6', 'Pay by card'), tc('DEMO-T1', 'Sign in', { component: 'Authentication', priority: 'Normal', businessCritical: false, playwrightRevalidationApproved: false })];
    const res = await importTestCasesToTestRail(cases, cfg(t.impl), { project: 'Failure Triage Project', sectionName: 'Failure Triage Demo' });

    expect(res).toEqual({ projectId: 7, keyMap: { 'DEMO-T6': 'C102', 'DEMO-T1': 'C104' }, created: ['DEMO-T6', 'DEMO-T1'], skipped: [] });
    expect(t.posts.map((p) => p.endpoint)).toEqual(['add_project', 'add_section/7', 'add_section/7', 'add_case/101', 'add_section/7', 'add_case/103']);
    expect(t.posts[3].body).toMatchObject({ title: 'Pay by card', template_id: 2, type_id: 3, priority_id: 4 });
    expect(t.posts[5].body.priority_id).toBe(2);
    expect(t.auth[0]).toBe('Basic ' + Buffer.from('qa@acme.test:k').toString('base64'));

    const again = await importTestCasesToTestRail(cases, cfg(t.impl), { project: 'Failure Triage Project', sectionName: 'Failure Triage Demo' });
    expect(again.skipped).toEqual(['DEMO-T6', 'DEMO-T1']);
    expect(t.posts).toHaveLength(6);

    const got = await new TestRailAdapter(cfg(t.impl)).getTestCases(['C102', 'C999', 'DEMO-T1']);
    expect(got).toEqual([
      {
        key: 'C102',
        name: 'Pay by card',
        objective: 'Pay by card',
        component: 'Checkout',
        priority: 'Critical',
        businessCritical: true,
        steps: [
          { index: 1, action: 'Navigate to /cart', expected: '' },
          { index: 2, action: 'Click button "Pay"', expected: 'Shows "Thanks"' },
        ],
        automationScript: 'automation-scripts/checkout.spec.ts',
        playwrightRevalidationApproved: true,
        labels: [],
      },
    ]);
  });

  it('makes no changes in dry-run mode', async () => {
    const t = fakeTestRail({ projects: [{ id: 3, name: 'Failure Triage Project', suite_mode: 1 }] });
    const res = await importTestCasesToTestRail([tc('DEMO-T6', 'Pay by card')], cfg(t.impl), { project: 'failure triage project', sectionName: 'Demo', dryRun: true });
    expect(t.posts).toEqual([]);
    expect(res.projectId).toBe(3);
  });

  it('reads cases written by hand (text steps, no metadata) and maps priorities', () => {
    expect(mapTestRailCase({ id: 5, title: 'Search', custom_steps: '1. Open /\n2. Search "x"', custom_expected: 'Results shown' }, 'Medium')).toMatchObject({
      key: 'C5',
      component: 'Unassigned',
      priority: 'Normal',
      businessCritical: false,
      steps: [
        { index: 1, action: 'Open /', expected: '' },
        { index: 2, action: 'Search "x"', expected: 'Results shown' },
      ],
    });
    const ps = [{ id: 1, name: 'Low' }, { id: 2, name: 'Medium', is_default: true }, { id: 4, name: 'Critical' }];
    expect(pickTestRailPriority('Critical', ps)).toBe(4);
    expect(pickTestRailPriority('Normal', ps)).toBe(2);
    expect(pickTestRailPriority('High', ps)).toBe(2);
  });
});
