import { describe, expect, it } from 'vitest';
import { FAILURE_LIBRARY } from '../src/integrations/mock-data/failures';
import fs from 'fs';
import path from 'path';
import { TEST_CASES } from '../src/integrations/mock-data/testCases';
import { correlateWithJira } from '../src/pipeline/jiraCorrelation';

const JIRA_ISSUES = JSON.parse(fs.readFileSync(path.join(__dirname, '../data-seeds/jira-issues.json'), 'utf8'));
const open = JIRA_ISSUES.filter((i: { statusCategory: string }) => i.statusCategory !== 'Done');
const input = (key: string) => {
  const tc = TEST_CASES.find((t) => t.key === key)!;
  return { testCaseKey: key, testName: tc.name, component: tc.component, release: '2.14.0', errorMessage: FAILURE_LIBRARY[key].errorMessage, testCase: tc };
};

describe('jira correlation', () => {
  it('semantically matches the checkout tax failure to SHOP-1301', () => {
    const m = correlateWithJira(input('SHOP-T402'), open);
    expect(m?.issue.key).toBe('SHOP-1301');
    expect(m?.method).toBe('SEMANTIC');
  });

  it('matches direct test case links', () => {
    expect(correlateWithJira(input('SHOP-T205'), open)?.method).toBe('TEST_CASE_LINK');
  });

  it.each(['SHOP-T405', 'SHOP-T512', 'SHOP-T610', 'SHOP-T702', 'SHOP-T215', 'SHOP-T803', 'SHOP-T120'])('does not falsely match %s', (key) => {
    expect(correlateWithJira(input(key), open)).toBeNull();
  });
});
