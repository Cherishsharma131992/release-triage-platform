import { FAILURE_LIBRARY, HISTORY_SEEDS, WAIVER_SEEDS } from '../adapters/mock/data/failures';
import type { FailureClassification } from '../domain/types';
import { computeFingerprint } from '../pipeline/fingerprint';
import type { HistoryRecord, Store } from './store';

/** Seeds historical failure records and approved waivers for the mock environment (idempotent). */
export function seedDemoData(store: Store): void {
  if (store.historyCount() === 0) {
    const byExecution = new Map<string, HistoryRecord[]>();
    for (const h of HISTORY_SEEDS) {
      const failure = FAILURE_LIBRARY[h.testCaseKey];
      const fp = computeFingerprint(h.testCaseKey, failure.errorMessage, failure.stackTrace);
      const list = byExecution.get(h.executionId) ?? [];
      list.push({
        executionId: h.executionId,
        release: h.release,
        build: h.build,
        executedAt: h.executedAt,
        testCaseKey: h.testCaseKey,
        signature: fp.signature,
        fingerprint: fp.fingerprint,
        normalizedMessage: fp.normalizedMessage,
        errorType: fp.errorType,
        jiraKey: h.jiraKey,
        classification: h.classification as FailureClassification,
      });
      byExecution.set(h.executionId, list);
    }
    for (const [executionId, records] of byExecution) store.replaceHistoryForExecution(executionId, records);
  }
  if (store.listWaivers().length === 0) {
    for (const w of WAIVER_SEEDS) store.addWaiver(w);
  }
}
