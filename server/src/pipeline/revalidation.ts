import type { TestCase, ValidationAttempt, ValidationResult } from '../domain/types';
import type { RevalidationAdapter } from '../adapters/types';
import { computeFingerprint } from './fingerprint';
import { round, textSimilarity } from '../util/text';

export interface RevalidationOptions {
  attempts: number;
  similarityThreshold: number;
}

export interface RevalidationTarget {
  executionId: string;
  testCase: TestCase;
  errorMessage: string | null;
  stackTrace: string | null;
  originalSignature: string;
}

export function notRequired(summary: string): ValidationResult {
  return { eligible: false, status: 'NOT_REQUIRED', attempts: [], summary };
}

export function notEligible(summary: string): ValidationResult {
  return { eligible: false, status: 'NOT_ELIGIBLE', attempts: [], summary };
}

const quotedValues = (s: string | null) => [...(s ?? '').matchAll(/"([^"]{2,})"/g)].map((m) => m[1]);

/**
 * True when every quoted value in the re-run failure (e.g. the expected text MCP could not find) also appears
 * in the original error. Runner and MCP word the same unmet expectation differently, so text similarity alone misses it.
 */
export function sameUnmetExpectation(rerunError: string | null, originalError: string | null): boolean {
  const values = quotedValues(rerunError);
  return values.length > 0 && values.every((v) => (originalError ?? '').includes(`"${v}"`));
}

/**
 * Re-executes an approved test case through Playwright MCP and compares each attempt with the
 * original failure. All attempts are run (no early exit) so intermittency can be detected.
 */
export async function revalidate(
  adapter: RevalidationAdapter,
  target: RevalidationTarget,
  opts: RevalidationOptions,
): Promise<ValidationResult> {
  const original = computeFingerprint(target.testCase.key, target.errorMessage, target.stackTrace);
  const attempts: ValidationAttempt[] = [];
  for (let i = 1; i <= opts.attempts; i++) {
    const executedAt = new Date().toISOString();
    try {
      const run = await adapter.runTestCase({
        executionId: target.executionId,
        testCase: target.testCase,
        attempt: i,
        originalErrorMessage: target.errorMessage,
        originalStackTrace: target.stackTrace,
      });
      let signature: string | null = null;
      let similarity: number | null = null;
      if (run.status === 'failed') {
        const fp = computeFingerprint(target.testCase.key, run.errorMessage, run.stackTrace);
        signature = fp.signature;
        similarity = fp.signature === target.originalSignature ? 1 : round(textSimilarity(fp.normalizedMessage, original.normalizedMessage));
        if (sameUnmetExpectation(run.errorMessage, target.errorMessage)) similarity = Math.max(similarity, 0.9);
      }
      attempts.push({ attempt: i, status: run.status, durationMs: run.durationMs, errorMessage: run.errorMessage, signature, similarityToOriginal: similarity, attachments: run.attachments, executedAt });
    } catch (err) {
      attempts.push({ attempt: i, status: 'error', durationMs: 0, errorMessage: (err as Error).message, signature: null, similarityToOriginal: null, attachments: [], executedAt });
    }
  }
  const passed = attempts.filter((a) => a.status === 'passed').length;
  const errored = attempts.filter((a) => a.status === 'error').length;
  const failedSame = attempts.filter((a) => a.status === 'failed' && (a.similarityToOriginal ?? 0) >= opts.similarityThreshold).length;
  const failedOther = attempts.filter((a) => a.status === 'failed').length - failedSame;
  const n = attempts.length;

  let status: ValidationResult['status'];
  let summary: string;
  if (errored === n) {
    status = 'INCONCLUSIVE';
    summary = `All ${n} re-execution attempts errored (${attempts[0]?.errorMessage ?? 'unknown error'}).`;
  } else if (failedSame > 0 && passed === 0) {
    status = 'REPRODUCED';
    summary = `Original failure reproduced in ${failedSame}/${n} attempts with the same signature.`;
  } else if (failedSame > 0) {
    status = 'INTERMITTENT';
    summary = `Failure reproduced in ${failedSame}/${n} attempts and passed in ${passed}/${n}: intermittent.`;
  } else if (failedOther > 0) {
    status = 'DIFFERENT_FAILURE';
    summary = `Re-execution failed in ${failedOther}/${n} attempts with a different signature than the original.`;
  } else {
    status = 'NOT_REPRODUCED';
    summary = `Passed in ${passed}/${n} re-execution attempts${errored ? ` (${errored} errored)` : ''}; original failure not reproduced.`;
  }
  return { eligible: true, status, attempts, summary };
}
