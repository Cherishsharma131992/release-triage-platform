import type { FailureClassification, Fingerprint, HistoricalMatch, HistoryAnalysis } from '../domain/types';
import type { HistoryRecord, Store } from '../store/store';
import { round, textSimilarity } from '../util/text';

export const SIMILAR_ERROR_THRESHOLD = 0.6;

function toMatch(r: HistoryRecord, matchType: HistoricalMatch['matchType'], similarity: number): HistoricalMatch {
  return {
    executionId: r.executionId,
    release: r.release,
    build: r.build,
    executedAt: r.executedAt,
    testCaseKey: r.testCaseKey,
    matchType,
    similarity: round(similarity),
    jiraKey: r.jiraKey,
    classification: r.classification,
  };
}

/**
 * Finds previous occurrences of the same or similar failure using test case ID,
 * failure fingerprint, signature (normalized error + stack frames) and message similarity.
 */
export function analyzeHistory(
  store: Store,
  executionId: string,
  testCaseKey: string | null,
  fp: Fingerprint,
): HistoryAnalysis {
  const sameTest: HistoricalMatch[] = [];
  if (testCaseKey) {
    for (const r of store.historyForTest(testCaseKey, executionId)) {
      if (r.fingerprint === fp.fingerprint) sameTest.push(toMatch(r, 'EXACT_FINGERPRINT', 1));
      else {
        const sim = textSimilarity(r.normalizedMessage, fp.normalizedMessage);
        if (sim >= SIMILAR_ERROR_THRESHOLD) sameTest.push(toMatch(r, 'SIMILAR_ERROR', sim));
      }
    }
  }
  const otherTests = store
    .historyBySignature(fp.signature, executionId)
    .filter((r) => r.testCaseKey !== testCaseKey)
    .map((r) => toMatch(r, 'SAME_SIGNATURE_OTHER_TEST', 1));

  const byRecency = (a: HistoricalMatch, b: HistoricalMatch) => b.executedAt.localeCompare(a.executedAt);
  sameTest.sort(byRecency);
  const previousClassifications: Partial<Record<FailureClassification, number>> = {};
  for (const m of sameTest) {
    if (m.classification) previousClassifications[m.classification] = (previousClassifications[m.classification] ?? 0) + 1;
  }
  const releases = [...sameTest].sort((a, b) => a.executedAt.localeCompare(b.executedAt)).map((m) => m.release);
  return {
    seenBefore: sameTest.length > 0,
    occurrences: sameTest.length,
    firstSeenRelease: releases[0] ?? null,
    lastSeenRelease: releases[releases.length - 1] ?? null,
    matches: [...sameTest, ...otherTests.sort(byRecency)].slice(0, 8),
    linkedJiraKeys: [...new Set(sameTest.map((m) => m.jiraKey).filter((k): k is string => !!k))],
    previousClassifications,
  };
}
