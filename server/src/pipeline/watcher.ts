import type { AutomationResultsAdapter } from '../integrations/types';
import type { Store } from '../store/store';
import type { AssessmentService } from './assessmentService';

/**
 * Detects completed executions that have not been assessed yet and triages them, oldest first.
 * Complements the push-based webhook (`POST /api/webhooks/execution-completed`).
 */
export async function assessPendingExecutions(
  results: AutomationResultsAdapter,
  store: Store,
  service: AssessmentService,
  log: (msg: string) => void = console.log,
): Promise<string[]> {
  const executions = (await results.listExecutions()).sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const assessed: string[] = [];
  for (const e of executions) {
    if (store.hasAssessmentForExecution(e.executionId)) continue;
    const a = await service.assess(e.executionId);
    log(`[watcher] assessed ${e.executionId}: ${a.decision.decision} (risk ${a.decision.riskScore})`);
    assessed.push(e.executionId);
  }
  return assessed;
}
