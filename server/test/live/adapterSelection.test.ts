import { describe, expect, it } from 'vitest';
import { adapterSelection, createAdapters } from '../../src/adapters/live';
import { Store } from '../../src/store/store';

describe('adapter selection', () => {
  it('defaults to mock and allows per-integration overrides', () => {
    expect(adapterSelection({})).toEqual({ results: 'mock', testCases: 'mock', defects: 'mock', revalidation: 'mock' });
    expect(adapterSelection({ ADAPTER_MODE: 'live', REVALIDATION_ADAPTER: 'mock' })).toEqual({ results: 'live', testCases: 'live', defects: 'live', revalidation: 'mock' });
    expect(() => adapterSelection({ DEFECTS_ADAPTER: 'jira' })).toThrow();
  });

  it('builds live adapters from env and fails fast on missing settings', () => {
    const store = new Store(':memory:');
    const a = createAdapters({ DEFECTS_ADAPTER: 'live', JIRA_BASE_URL: 'https://a.atlassian.net', JIRA_EMAIL: 'e', JIRA_API_TOKEN: 't', JIRA_PROJECT_KEYS: 'SHOP' }, store);
    expect(a.defects.adapter).toBe('jira-cloud');
    expect(a.results.adapter).toBe('mock-allure');
    expect(() => createAdapters({ TCM_ADAPTER: 'live' }, store)).toThrow(/ZEPHYR_API_TOKEN/);
  });
});
