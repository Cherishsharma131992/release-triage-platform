import path from 'path';
import { describe, expect, it } from 'vitest';
import { adapterSelection, createAdapters } from '../../src/integrations';
import { Store } from '../../src/store/store';

describe('adapter selection', () => {
  it('defaults to mock and allows per-integration overrides', () => {
    expect(adapterSelection({})).toEqual({ results: 'mock', testCases: 'mock', defects: 'mock', revalidation: 'mock' });
    expect(adapterSelection({ ADAPTER_MODE: 'live', REVALIDATION_ADAPTER: 'mock' })).toEqual({ results: 'live', testCases: 'live', defects: 'live', revalidation: 'mock' });
    expect(() => adapterSelection({ DEFECTS_ADAPTER: 'jira' })).toThrow();
    expect(() => adapterSelection({ RESULTS_ADAPTER: 'file' })).toThrow();
    expect(adapterSelection({ TCM_ADAPTER: 'file', DEFECTS_ADAPTER: 'file' }).defects).toBe('file');
  });

  it('builds live adapters from env and fails fast on missing settings', () => {
    const store = new Store(':memory:');
    const a = createAdapters({ DEFECTS_ADAPTER: 'live', JIRA_BASE_URL: 'https://a.atlassian.net', JIRA_EMAIL: 'e', JIRA_API_TOKEN: 't', JIRA_PROJECT_KEYS: 'SHOP' }, store);
    expect(a.defects.adapter).toBe('jira-cloud');
    expect(a.results.adapter).toBe('mock-allure');
    expect(() => createAdapters({ TCM_ADAPTER: 'live' }, store)).toThrow(/ZEPHYR_API_TOKEN/);
    expect(() => createAdapters({ TCM_ADAPTER: 'file' }, store)).toThrow(/ZEPHYR_TESTCASES_FILE/);
    expect(() => createAdapters({ TCM_ADAPTER: 'testrail' }, store)).toThrow(/TESTRAIL_URL/);
    expect(createAdapters({ TCM_ADAPTER: 'testrail', TESTRAIL_URL: 'https://x.testrail.io', TESTRAIL_USER: 'u', TESTRAIL_API_KEY: 'k' }, store).testCases.adapter).toBe('testrail');
  });

  it('reads the demo Zephyr/Jira exports', async () => {
    const demo = path.join(__dirname, '..', '..', '..', 'demo', 'integrations');
    const a = createAdapters({ TCM_ADAPTER: 'file', ZEPHYR_TESTCASES_FILE: path.join(demo, 'zephyr', 'zephyr-testcases.json'), DEFECTS_ADAPTER: 'file', JIRA_ISSUES_FILE: path.join(demo, 'jira', 'jira-issues.json') }, new Store(':memory:'));
    expect((await a.testCases.getTestCases(['DEMO-T6', 'NOPE']))[0].steps).toHaveLength(4);
    expect((await a.defects.searchIssues({ text: '', testCaseKey: null, components: [], openOnly: true })).map((i) => i.key)).toEqual(['DEMO-101', 'DEMO-110']);
  });
});
