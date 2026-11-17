import type { AIClassification, FailureClassification, ModelInfo } from '../domain/types';
import { round } from '../util/text';
import type { AIProvider, DecisionExplanationInput, FailureAnalysisInput, ValidationAssessmentInput } from './provider';

interface Rule {
  classification: FailureClassification;
  weight: number;
  pattern: RegExp;
  signal: string;
}

const RULES: Rule[] = [
  {
    classification: 'ENVIRONMENT',
    weight: 1.0,
    pattern: /ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|net::ERR_(NAME_NOT_RESOLVED|CONNECTION_REFUSED|CONNECTION_RESET|INTERNET_DISCONNECTED)|\b(502|503|504)\b|Bad Gateway|Service Unavailable|Gateway Timeout|certificate has expired|database connection|connection pool/i,
    signal: 'Network/infrastructure error signature (connection refused, DNS, 5xx gateway)',
  },
  {
    classification: 'TEST_DATA',
    weight: 0.9,
    pattern: /test data|fixture|seed(ed)? data|already exists|duplicate key|not found in (catalog|inventory|database)|account (is )?locked|409 Conflict|SKU-TEST/i,
    signal: 'Error references missing or conflicting test data',
  },
  {
    classification: 'AUTOMATION_SCRIPT',
    weight: 0.9,
    pattern: /TypeError: Cannot read propert|ReferenceError|is not a function|strict mode violation|Unknown engine|Invalid selector|is not defined/i,
    signal: 'Script-level runtime error (TypeError/ReferenceError/selector misuse)',
  },
  {
    classification: 'TIMING_SYNC',
    weight: 0.8,
    pattern: /TimeoutError|Timeout \d+ms exceeded|waiting for (locator|selector|navigation|getBy)|element is not (stable|visible|attached)|detached from (the )?DOM/i,
    signal: 'Wait/synchronization timeout on UI element',
  },
  {
    classification: 'APPLICATION_DEFECT',
    weight: 0.6,
    pattern: /expect\(.*\)\.(toBe|toEqual|toHaveText|toContainText|toHaveCount|toHaveValue|toHaveURL|toContain|toBeGreaterThan)|AssertionError|500 Internal Server Error|status(Code)? 500|Unhandled exception|Payment failed/i,
    signal: 'Functional assertion on application behaviour failed',
  },
];

const ROOT_CAUSE: Record<FailureClassification, string> = {
  APPLICATION_DEFECT: 'Application behaviour deviates from the expected result defined in the test case.',
  AUTOMATION_SCRIPT: 'Defect in the automation code (page object / script) rather than in the application.',
  ENVIRONMENT: 'Dependent service or infrastructure was unreachable or unhealthy during execution.',
  TEST_DATA: 'Required test data was missing, stale or conflicting in the target environment.',
  TIMING_SYNC: 'UI synchronization issue: the element did not reach the expected state within the wait timeout.',
  FLAKY: 'Non-deterministic failure: the test alternates between pass and fail without code changes.',
  INCONCLUSIVE: 'Evidence is insufficient to determine a root cause with confidence.',
};

const ACTION: Record<FailureClassification, string> = {
  APPLICATION_DEFECT: 'Raise/prioritise a Jira defect with the attached evidence and assess release impact.',
  AUTOMATION_SCRIPT: 'Assign to the automation team to fix the script; does not indicate a product defect.',
  ENVIRONMENT: 'Notify the environment/platform team; re-run once the dependency is healthy.',
  TEST_DATA: 'Refresh or re-seed the test data, then re-run the test.',
  TIMING_SYNC: 'Harden waits/synchronization in the script; monitor for performance regressions.',
  FLAKY: 'Quarantine and stabilise the test; track flake rate.',
  INCONCLUSIVE: 'Manual QA verification required before this failure can be cleared.',
};

const clamp = (n: number) => round(Math.max(0.05, Math.min(0.99, n)));

/** Deterministic, explainable rule-based provider used when no LLM is configured (and as LLM fallback). */
export class HeuristicProvider implements AIProvider {
  readonly info: ModelInfo = { provider: 'builtin', model: 'heuristic-triage', version: '1.0.0' };

  private build(
    classification: FailureClassification,
    confidence: number,
    reasoning: string[],
    signals: string[],
    rootCause?: string,
    action?: string,
  ): AIClassification {
    return {
      classification,
      confidence: clamp(confidence),
      rootCause: rootCause ?? ROOT_CAUSE[classification],
      reasoning,
      signals,
      recommendedAction: action ?? ACTION[classification],
      analyzedBy: this.info,
      analyzedAt: new Date().toISOString(),
    };
  }

  async classifyFailure(input: FailureAnalysisInput): Promise<AIClassification> {
    const text = `${input.errorMessage ?? ''}\n${input.stackTrace ?? ''}`;
    const scores = new Map<FailureClassification, number>();
    const signals: string[] = [];
    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        scores.set(rule.classification, (scores.get(rule.classification) ?? 0) + rule.weight);
        signals.push(rule.signal);
      }
    }
    const topFrame = (input.stackTrace ?? '').split('\n').find((l) => l.trim().startsWith('at ')) ?? '';
    if (/\/(pages|page-objects|helpers|support)\//i.test(topFrame) && scores.has('AUTOMATION_SCRIPT')) {
      scores.set('AUTOMATION_SCRIPT', (scores.get('AUTOMATION_SCRIPT') ?? 0) + 0.3);
      signals.push('Top stack frame is inside automation page-object/helper code');
    }
    const flakyHistory = input.history.previousClassifications.FLAKY ?? 0;
    if (flakyHistory > 0) {
      scores.set('FLAKY', (scores.get('FLAKY') ?? 0) + 0.7);
      signals.push(`Previously classified as flaky in ${flakyHistory} historical run(s)`);
    }

    const reasoning: string[] = [];
    if (input.jira) {
      const j = input.jira;
      const cls: FailureClassification = j.issue.labels.includes('automation')
        ? 'AUTOMATION_SCRIPT'
        : j.issue.labels.includes('environment')
          ? 'ENVIRONMENT'
          : 'APPLICATION_DEFECT';
      reasoning.push(
        `Failure correlated with Jira ${j.issue.key} (${j.issue.severity}, ${j.issue.status}) via ${j.method.replace(/_/g, ' ').toLowerCase()} (score ${j.score}).`,
        ...j.reasons,
      );
      if (input.history.seenBefore) {
        reasoning.push(`Same failure seen ${input.history.occurrences}× before (first in ${input.history.firstSeenRelease}).`);
      }
      const conf = j.method === 'SEMANTIC' ? 0.55 + 0.35 * j.score : 0.92;
      return this.build(cls, conf, reasoning, signals, `${ROOT_CAUSE[cls]} Tracked as ${j.issue.key}: ${j.issue.summary}.`,
        input.category === 'KNOWN_OPEN_DEFECT'
          ? `Known issue ${j.issue.key}: confirm a business waiver exists or fix before release.`
          : `Link failure to ${j.issue.key} and confirm the fix version / waiver.`);
    }

    if (scores.size === 0) {
      reasoning.push('No known failure signature matched the error message or stack trace.');
      return this.build('INCONCLUSIVE', 0.3, reasoning, signals);
    }
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [top, topScore] = ranked[0];
    const total = ranked.reduce((s, [, v]) => s + v, 0);
    reasoning.push(
      `Strongest signal: ${top.replace(/_/g, ' ').toLowerCase()} (weight ${round(topScore)} of ${round(total)}).`,
      ...ranked.slice(1).map(([c, v]) => `Competing signal: ${c.replace(/_/g, ' ').toLowerCase()} (weight ${round(v)}).`),
    );
    if (input.history.seenBefore) {
      reasoning.push(
        `Seen ${input.history.occurrences}× in previous executions (${input.history.firstSeenRelease} → ${input.history.lastSeenRelease}) without an open Jira defect.`,
      );
    } else {
      reasoning.push('No previous occurrence of this failure in execution history.');
    }
    return this.build(top, 0.45 + 0.5 * (topScore / total), reasoning, signals);
  }

  async assessValidation({ initial, validation }: ValidationAssessmentInput): Promise<AIClassification> {
    const reasoning = [...initial.reasoning, `Playwright MCP validation: ${validation.summary}`];
    const c = initial.classification;
    const keep = (conf: number, extra?: string) =>
      this.build(c, conf, extra ? [...reasoning, extra] : reasoning, initial.signals, initial.rootCause, initial.recommendedAction);
    switch (validation.status) {
      case 'NOT_REQUIRED':
        return keep(initial.confidence);
      case 'NOT_ELIGIBLE':
        return keep(initial.confidence * 0.85, 'Re-execution not performed, so the classification relies on static evidence only.');
      case 'REPRODUCED':
        if (c === 'FLAKY' || c === 'INCONCLUSIVE') {
          return this.build('APPLICATION_DEFECT', 0.6, [...reasoning, 'Failure reproduced consistently on every attempt, so it is not intermittent.'], initial.signals);
        }
        return keep(Math.max(initial.confidence + 0.1, c === 'APPLICATION_DEFECT' ? 0.9 : 0.75), 'Same failure signature reproduced on every re-execution.');
      case 'INTERMITTENT':
        if (c === 'APPLICATION_DEFECT') {
          return keep(0.65, 'Failure reproduced intermittently; possible race condition in the application.');
        }
        return this.build('FLAKY', 0.78, [...reasoning, 'Re-executions alternated between pass and fail with the same signature.'], initial.signals);
      case 'NOT_REPRODUCED':
        if (c === 'APPLICATION_DEFECT') {
          return this.build(
            'INCONCLUSIVE',
            0.45,
            [...reasoning, 'A passing re-run is not proof that the original failure was false; the probable application defect could not be reproduced.'],
            initial.signals,
            'Probable application defect that could not be reproduced on re-execution.',
            'Manual QA verification of the original evidence required.',
          );
        }
        if (c === 'ENVIRONMENT') return keep(0.75, 'Not reproduced once the environment recovered: consistent with a transient infrastructure issue.');
        if (c === 'TIMING_SYNC' || c === 'FLAKY') return keep(0.72, 'Not reproduced on re-execution: consistent with a timing/flaky failure.');
        return keep(initial.confidence * 0.7, 'Not reproduced on re-execution; original classification retained with reduced confidence.');
      case 'DIFFERENT_FAILURE':
        return this.build('INCONCLUSIVE', 0.4, [...reasoning, 'Re-execution failed with a different signature than the original run.'], initial.signals);
      case 'INCONCLUSIVE':
      default:
        if (c === 'ENVIRONMENT') return keep(initial.confidence * 0.8, 'Re-execution could not be completed.');
        return this.build(
          'INCONCLUSIVE',
          0.4,
          [...reasoning, `Re-execution could not be completed, so the initial ${c.replace(/_/g, ' ').toLowerCase()} assessment is unconfirmed.`],
          initial.signals,
          `Unconfirmed: initial assessment was ${c.replace(/_/g, ' ').toLowerCase()}. ${initial.rootCause}`,
          'Complete Playwright re-validation or perform manual verification.',
        );
    }
  }

  async explainDecision({ execution, health, categoryCounts, decision }: DecisionExplanationInput): Promise<string> {
    const label = decision.decision.replace('_', '-');
    const failed = decision.criteria.filter((c) => !c.passed);
    const parts: string[] = [];
    parts.push(
      `Recommendation: ${label}. Release ${execution.release} (build ${execution.build}, ${execution.environment}) executed ${health.executed} tests with a ${health.passRate}% pass rate. ` +
        `Overall risk score is ${decision.riskScore}/100 (${decision.riskLevel}).`,
    );
    if (failed.length === 0) {
      parts.push(`All ${decision.criteria.length} release criteria of "${decision.policy.name}" v${decision.policy.version} passed.`);
    } else {
      parts.push(
        `${failed.length} of ${decision.criteria.length} release criteria failed: ` +
          failed.map((c) => `${c.ruleId} ${c.name} (→ ${c.outcomeIfFailed.replace('_', '-')})`).join('; ') + '.',
      );
    }
    if (decision.blockers.length) parts.push(`Release blockers: ${decision.blockers.join('; ')}.`);
    if (decision.outstandingValidations.length) parts.push(`Outstanding validation: ${decision.outstandingValidations.join('; ')}.`);
    if (decision.acceptedRisks.length) parts.push(`Accepted risks (approved waivers): ${decision.acceptedRisks.join('; ')}.`);
    parts.push(
      `Failure triage: ${categoryCounts.knownOpenDefects} known open defect(s), ${categoryCounts.newWithJira} new failure(s) matched to existing Jira defects, ` +
        `${categoryCounts.newWithoutJira} new failure(s) without Jira (${categoryCounts.potentialGenuineDefects} probable genuine defect(s), ` +
        `${categoryCounts.automationOrFlaky} automation/flaky, ${categoryCounts.environment} environment, ${categoryCounts.testData} test data, ${categoryCounts.inconclusive} inconclusive).`,
    );
    parts.push(
      `The decision was computed by the deterministic policy engine (${decision.policy.name} v${decision.policy.version}, hash ${decision.policy.hash}); this narrative explains it and does not change it.`,
    );
    return parts.join('\n\n');
  }
}
