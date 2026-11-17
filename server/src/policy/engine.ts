import type {
  CriterionResult,
  Decision,
  FailureRecord,
  IntegrationStatus,
  JiraIssue,
  ReleaseDecision,
  ReleaseHealth,
  ReleaseImpact,
  RiskLevel,
} from '../domain/types';
import { round } from '../util/text';
import type { CheckId, ReleasePolicy } from './policy';

export interface PolicyContext {
  release: string;
  health: ReleaseHealth;
  failures: FailureRecord[];
  integrations: IntegrationStatus[];
}

export interface PolicyEvaluation {
  decision: Omit<ReleaseDecision, 'explanation'>;
  impacts: Record<string, { releaseImpact: ReleaseImpact; riskContribution: number }>;
}

const isOpen = (i: JiraIssue) => i.statusCategory !== 'Done';
const label = (f: FailureRecord) => `${f.testCaseKey ?? f.resultId} ${f.testName}`;
const defectLabel = (i: JiraIssue) => `${i.key} (${i.severity}/${i.priority}, ${i.status})`;

const CHECK_DESCRIPTIONS: Record<CheckId, string> = {
  'min-pass-rate': 'Execution pass rate must meet the minimum threshold.',
  'no-unwaived-blocking-defects': 'No open defect at blocking severity/priority may remain without an approved waiver.',
  'no-validated-high-impact-new-defects': 'No new application defect, reproduced via Playwright, may affect a business-critical or high-priority test.',
  'business-critical-functionality-passed': 'Business-critical test cases must not fail due to application defects (unless waived).',
  'risk-within-threshold': 'Aggregated release risk score must not exceed the approved organisational threshold.',
  'known-defects-approved': 'Every open Jira defect affecting this run must have an approved business waiver.',
  'critical-validation-complete': 'All required failure validation must be complete and conclusive.',
  'integrations-available': 'TCM, automation results, Jira and Playwright MCP data must be available.',
  'sufficient-evidence': 'AI confidence on business-critical failures must meet the minimum threshold.',
};

/** Deterministic release decision engine: same inputs + same policy ⇒ same decision. */
export function evaluatePolicy(policy: ReleasePolicy, ctx: PolicyContext): PolicyEvaluation {
  const blockingSev = new Set<string>(policy.blockingDefects.severities);
  const blockingPri = new Set<string>(policy.blockingDefects.priorities);
  const isBlocking = (i: JiraIssue) => blockingSev.has(i.severity) || blockingPri.has(i.priority);
  const highImpactTest = (f: FailureRecord) => f.businessCritical || f.testPriority === 'Critical' || f.testPriority === 'High';
  const openDefect = (f: FailureRecord) => (f.jira && isOpen(f.jira.issue) ? f.jira.issue : null);

  // Per-failure release impact and risk contribution.
  const impacts: PolicyEvaluation['impacts'] = {};
  const countedDefects = new Set<string>();
  let riskScore = 0;
  for (const f of ctx.failures) {
    const cls = f.finalAnalysis.classification;
    let impact: ReleaseImpact = 'LOW';
    let risk = 0;
    const defect = openDefect(f);
    if (defect) {
      if (f.waiver) impact = 'LOW';
      else if (isBlocking(defect)) impact = 'BLOCKING';
      else impact = defect.severity === 'Major' ? 'MEDIUM' : 'LOW';
      if (!countedDefects.has(defect.key)) {
        countedDefects.add(defect.key);
        risk = (policy.risk.severityWeights[defect.severity] ?? 0) * (f.waiver ? policy.risk.waivedMultiplier : 1);
      }
    } else {
      if (cls === 'APPLICATION_DEFECT') {
        const validated = f.validation.status === 'REPRODUCED' || f.validation.status === 'INTERMITTENT';
        impact = highImpactTest(f) && validated ? 'BLOCKING' : 'HIGH';
      } else if (cls === 'INCONCLUSIVE') {
        impact = f.businessCritical ? 'HIGH' : 'MEDIUM';
      }
      risk = (policy.risk.classificationWeights[cls] ?? 0) * (f.businessCritical ? policy.risk.businessCriticalMultiplier : 1);
    }
    impacts[f.id] = { releaseImpact: impact, riskContribution: round(risk, 1) };
    riskScore += risk;
  }
  riskScore += Math.max(0, policy.thresholds.minPassRate - ctx.health.passRate) * policy.risk.passRatePenaltyPerPoint;
  riskScore = round(Math.min(100, riskScore), 1);
  const riskLevel: RiskLevel =
    riskScore < policy.risk.levels.low ? 'LOW' : riskScore < policy.risk.levels.medium ? 'MEDIUM' : riskScore < policy.risk.levels.high ? 'HIGH' : 'CRITICAL';

  const inScope = (f: FailureRecord) => policy.validation.inconclusiveScope === 'all' || f.businessCritical;

  const checks: Record<CheckId, () => { passed: boolean; details: string; evidence: string[] }> = {
    'min-pass-rate': () => ({
      passed: ctx.health.passRate >= policy.thresholds.minPassRate,
      details: `Pass rate ${ctx.health.passRate}% vs. required ${policy.thresholds.minPassRate}%.`,
      evidence: [],
    }),
    'no-unwaived-blocking-defects': () => {
      const hits = ctx.failures.filter((f) => {
        const d = openDefect(f);
        return d && isBlocking(d) && !f.waiver;
      });
      const defects = [...new Map(hits.map((f) => [f.jira!.issue.key, f])).values()];
      return {
        passed: defects.length === 0,
        details: defects.length ? `${defects.length} unwaived blocking defect(s).` : 'No unwaived blocking defects.',
        evidence: defects.map((f) => `${defectLabel(f.jira!.issue)} — ${f.jira!.issue.summary} [${f.testCaseKey}]`),
      };
    },
    'no-validated-high-impact-new-defects': () => {
      const hits = ctx.failures.filter(
        (f) =>
          f.category === 'NEW_NO_JIRA' &&
          f.finalAnalysis.classification === 'APPLICATION_DEFECT' &&
          (f.validation.status === 'REPRODUCED' || f.validation.status === 'INTERMITTENT') &&
          highImpactTest(f),
      );
      return {
        passed: hits.length === 0,
        details: hits.length ? `${hits.length} validated new high-impact application defect(s) without Jira.` : 'None found.',
        evidence: hits.map((f) => `${label(f)} — ${f.validation.status.toLowerCase()} via Playwright MCP, no Jira defect`),
      };
    },
    'business-critical-functionality-passed': () => {
      const hits = ctx.failures.filter((f) => f.businessCritical && f.finalAnalysis.classification === 'APPLICATION_DEFECT' && !f.waiver);
      return {
        passed: hits.length === 0,
        details: hits.length ? `${hits.length} business-critical test(s) failing due to application defects.` : 'All business-critical functionality passed or failures are non-product.',
        evidence: hits.map((f) => `${label(f)} (${f.component})`),
      };
    },
    'risk-within-threshold': () => ({
      passed: riskScore <= policy.thresholds.maxRiskScore,
      details: `Risk score ${riskScore} vs. maximum ${policy.thresholds.maxRiskScore}.`,
      evidence: [],
    }),
    'known-defects-approved': () => {
      const hits = ctx.failures.filter((f) => {
        const d = openDefect(f);
        return d && !isBlocking(d) && !f.waiver;
      });
      const defects = [...new Map(hits.map((f) => [f.jira!.issue.key, f])).values()];
      return {
        passed: defects.length === 0,
        details: defects.length ? `${defects.length} open defect(s) without business approval / waiver.` : 'All open defects are waived or none exist.',
        evidence: defects.map((f) => `${defectLabel(f.jira!.issue)} — ${f.jira!.issue.summary} [${f.testCaseKey}]`),
      };
    },
    'critical-validation-complete': () => {
      const hits = ctx.failures.filter(
        (f) =>
          inScope(f) &&
          !openDefect(f) &&
          (f.finalAnalysis.classification === 'INCONCLUSIVE' ||
            f.validation.status === 'INCONCLUSIVE' ||
            f.validation.status === 'DIFFERENT_FAILURE' ||
            (f.validation.status === 'NOT_ELIGIBLE' && f.finalAnalysis.classification === 'APPLICATION_DEFECT')),
      );
      return {
        passed: hits.length === 0,
        details: hits.length ? `${hits.length} failure(s) with pending/inconclusive validation.` : 'All required validation complete.',
        evidence: hits.map((f) => `${label(f)} — ${f.validation.summary}`),
      };
    },
    'integrations-available': () => {
      const down = ctx.integrations.filter((i) => i.status === 'UNAVAILABLE');
      return {
        passed: down.length === 0,
        details: down.length ? `${down.length} integration(s) unavailable.` : 'All integrations available.',
        evidence: down.map((i) => `${i.name}: ${i.message ?? 'unavailable'}`),
      };
    },
    'sufficient-evidence': () => {
      const hits = ctx.failures.filter((f) => f.businessCritical && f.finalAnalysis.confidence < policy.thresholds.minConfidenceForCritical);
      return {
        passed: hits.length === 0,
        details: hits.length ? `${hits.length} business-critical failure(s) below ${policy.thresholds.minConfidenceForCritical} confidence.` : 'Evidence sufficient.',
        evidence: hits.map((f) => `${label(f)} — confidence ${f.finalAnalysis.confidence}`),
      };
    },
  };

  const criteria: CriterionResult[] = policy.rules
    .filter((r) => r.enabled)
    .map((r) => {
      const result = checks[r.check]();
      return {
        ruleId: r.id,
        name: r.name,
        description: r.description ?? CHECK_DESCRIPTIONS[r.check],
        mandatory: true,
        passed: result.passed,
        outcomeIfFailed: r.onFail,
        details: result.details,
        evidence: result.evidence,
        policyRef: `${policy.policy.name} v${policy.policy.version} §${r.id}`,
      };
    });

  const failed = criteria.filter((c) => !c.passed);
  const decision: Decision = failed.some((c) => c.outcomeIfFailed === 'NO_GO') ? 'NO_GO' : failed.length ? 'HOLD' : 'GO';
  const unique = (xs: string[]) => [...new Set(xs)];

  return {
    decision: {
      decision,
      riskScore,
      riskLevel,
      criteria,
      blockers: unique(failed.filter((c) => c.outcomeIfFailed === 'NO_GO').flatMap((c) => (c.evidence.length ? c.evidence : [c.details]))),
      outstandingValidations: unique(failed.filter((c) => c.outcomeIfFailed === 'HOLD').flatMap((c) => (c.evidence.length ? c.evidence : [c.details]))),
      acceptedRisks: unique(
        ctx.failures
          .filter((f) => f.waiver && f.jira)
          .map((f) => `${f.jira!.issue.key} waived by ${f.waiver!.approvedBy} (${f.waiver!.approverRole}) until ${f.waiver!.expiresAt.slice(0, 10)}`),
      ),
      businessCriticalImpacted: unique(
        ctx.failures.filter((f) => f.businessCritical).map((f) => `${label(f)} (${f.component}) — ${f.finalAnalysis.classification.replace(/_/g, ' ').toLowerCase()}`),
      ),
      policy: { name: policy.policy.name, version: policy.policy.version, hash: policy.hash },
    },
    impacts,
  };
}
