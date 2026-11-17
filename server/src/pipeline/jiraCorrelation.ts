import type { JiraIssue, JiraMatch, TestCase } from '../domain/types';
import { round, textSimilarity } from '../util/text';

export const MIN_TEXT_SIMILARITY = 0.2;
export const MATCH_THRESHOLD = 0.45;

export interface CorrelationInput {
  testCaseKey: string | null;
  testName: string;
  component: string;
  release: string;
  errorMessage: string | null;
  testCase: TestCase | null;
}

/**
 * Ranks candidate Jira issues for a failure. Direct test-case links win outright; otherwise a
 * semantic score combines text similarity (failure text vs. issue summary/description) with
 * component and version alignment. Text similarity must clear a floor so that component/version
 * alone never produce a match.
 */
export function correlateWithJira(input: CorrelationInput, candidates: JiraIssue[]): JiraMatch | null {
  const failureText = [input.testName, input.testCase?.objective ?? '', input.errorMessage ?? ''].join(' ');
  let best: JiraMatch | null = null;
  for (const issue of candidates) {
    const reasons: string[] = [];
    let score: number;
    let method: JiraMatch['method'];
    if (input.testCaseKey && issue.linkedTestCases.includes(input.testCaseKey)) {
      score = 1;
      method = 'TEST_CASE_LINK';
      reasons.push(`Issue is linked to test case ${input.testCaseKey}`);
    } else {
      const textSim = textSimilarity(failureText, `${issue.summary} ${issue.description}`);
      if (textSim < MIN_TEXT_SIMILARITY) continue;
      const component = issue.components.some((c) => c.toLowerCase() === input.component.toLowerCase()) ? 1 : 0;
      const version = [...issue.affectsVersions, ...issue.fixVersions].includes(input.release) ? 1 : 0;
      score = 0.6 * textSim + 0.25 * component + 0.15 * version;
      method = 'SEMANTIC';
      reasons.push(`Semantic similarity of failure and issue text: ${round(textSim)}`);
      if (component) reasons.push(`Same component (${input.component})`);
      if (version) reasons.push(`Issue targets release ${input.release}`);
    }
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { issue, score: round(score), method, reasons };
    }
  }
  return best;
}
