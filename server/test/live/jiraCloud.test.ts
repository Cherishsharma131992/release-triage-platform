import { describe, expect, it } from 'vitest';
import { JiraCloudAdapter, adfToText, jiraConfigFromEnv } from '../../src/integrations/jira/jiraCloud';
import { fakeFetch } from './fakeFetch';

const issue = (key: string, extra: Record<string, unknown> = {}) => ({
  key,
  fields: {
    summary: `Checkout total wrong for SHOP-T402`,
    description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'VAT is ' }, { type: 'text', text: 'missing' }] }] },
    issuetype: { name: 'Bug' },
    status: { name: 'In Review', statusCategory: { key: 'indeterminate' } },
    priority: { name: 'High' },
    components: [{ name: 'Checkout' }],
    labels: ['regression', 'SHOP-T405'],
    versions: [{ name: '2.14.0' }],
    fixVersions: [],
    created: '2026-11-01T10:00:00.000+0000',
    updated: '2026-11-02T10:00:00.000+0000',
    resolutiondate: null,
    customfield_10050: { value: 'Critical' },
    ...extra,
  },
});

function adapter(routes: Parameters<typeof fakeFetch>[0]) {
  const f = fakeFetch(routes);
  const cfg = jiraConfigFromEnv({ JIRA_BASE_URL: 'https://acme.atlassian.net', JIRA_EMAIL: 'qa@acme.io', JIRA_API_TOKEN: 'tok', JIRA_PROJECT_KEYS: 'SHOP, PAY', JIRA_SEVERITY_FIELD: 'customfield_10050' });
  return { a: new JiraCloudAdapter({ ...cfg, fetchImpl: f.impl }), calls: f.calls };
}

describe('JiraCloudAdapter', () => {
  it('requires credentials', () => {
    expect(() => jiraConfigFromEnv({})).toThrow(/JIRA_BASE_URL/);
  });

  it('maps issues, severity field, ADF text and linked test cases', async () => {
    const { a, calls } = adapter({ '/rest/api/3/search/jql': () => ({ issues: [issue('SHOP-1')], isLast: true }) });
    const [i] = await a.getIssues(['SHOP-1']);
    expect(i).toMatchObject({
      key: 'SHOP-1',
      description: 'VAT is missing',
      statusCategory: 'In Progress',
      severity: 'Critical',
      priority: 'High',
      components: ['Checkout'],
      affectsVersions: ['2.14.0'],
      url: 'https://acme.atlassian.net/browse/SHOP-1',
    });
    expect(i.linkedTestCases.sort()).toEqual(['SHOP-T402', 'SHOP-T405']);
    expect(calls[0].url.searchParams.get('jql')).toBe('key in ("SHOP-1")');
    expect(calls[0].url.searchParams.get('fields')).toContain('customfield_10050');
    expect(calls[0].headers.Authorization).toBe(`Basic ${Buffer.from('qa@acme.io:tok').toString('base64')}`);
  });

  it('falls back to priority-derived severity and builds scoped JQL with pagination', async () => {
    let page = 0;
    const { a, calls } = adapter({
      '/rest/api/3/search/jql': () =>
        page++ === 0
          ? { issues: [issue('SHOP-2', { customfield_10050: null, priority: { name: 'Highest' } })], isLast: false, nextPageToken: 'p2' }
          : { issues: [issue('SHOP-3', { status: { name: 'Done', statusCategory: { key: 'done' } } })], isLast: true },
    });
    const res = await a.searchIssues({ text: 'x', testCaseKey: 'SHOP-T402', components: [], openOnly: true });
    expect(res.map((r) => r.key)).toEqual(['SHOP-2', 'SHOP-3']);
    expect(res[0].severity).toBe('Blocker');
    expect(res[1].statusCategory).toBe('Done');
    expect(calls[0].url.searchParams.get('jql')).toBe(
      '(project in ("SHOP","PAY") AND issuetype in ("Bug") AND statusCategory != Done) OR (labels = "SHOP-T402") ORDER BY updated DESC',
    );
    expect(calls[1].url.searchParams.get('nextPageToken')).toBe('p2');
  });

  it('reports health from /myself without leaking credentials', async () => {
    const ok = adapter({ '/rest/api/3/myself': () => ({ accountId: '1' }) });
    expect(await ok.a.healthCheck()).toEqual({ ok: true });
    const bad = adapter({});
    const h = await bad.a.healthCheck();
    expect(h.ok).toBe(false);
    expect(h.message).toMatch(/HTTP 404/);
    expect(h.message).not.toContain('tok');
  });

  it('flattens nested ADF', () => {
    expect(adfToText({ type: 'doc', content: [{ type: 'heading', content: [{ type: 'text', text: 'A' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'B' }, { type: 'hardBreak' }, { type: 'text', text: 'C' }] }] })).toBe('A\nB\nC\n');
  });
});
