import type { Adapters, AdapterBase } from '../integrations/types';
import type { AIProvider, FailureAnalysisInput } from '../ai/provider';
import type {
  Assessment,
  CategoryCounts,
  DefectSummary,
  FailureRecord,
  IntegrationStatus,
  JiraIssue,
  ReleaseHealth,
  TestCase,
  TestResult,
  ValidationSummary,
} from '../domain/types';
import { evaluatePolicy } from '../policy/engine';
import type { ReleasePolicy } from '../policy/policy';
import type { HistoryRecord, Store } from '../store/store';
import { newId } from '../util/ids';
import { round } from '../util/text';
import { computeFingerprint } from './fingerprint';
import { analyzeHistory } from './history';
import { correlateWithJira } from './jiraCorrelation';
import { notEligible, notRequired, revalidate } from './revalidation';

export const PLATFORM_VERSION = '0.1.0';

export interface AssessmentDeps {
  adapters: Adapters;
  ai: AIProvider;
  policy: () => ReleasePolicy;
  store: Store;
}

class IntegrationTracker {
  private readonly statuses = new Map<string, IntegrationStatus>();

  async check(a: AdapterBase): Promise<void> {
    try {
      const r = await a.healthCheck();
      this.statuses.set(a.adapter, { name: a.name, adapter: a.adapter, status: r.ok ? 'OK' : 'UNAVAILABLE', message: r.message ?? null });
    } catch (err) {
      this.statuses.set(a.adapter, { name: a.name, adapter: a.adapter, status: 'UNAVAILABLE', message: (err as Error).message });
    }
  }

  fail(a: AdapterBase, err: unknown, degradedOnly = false): void {
    const prev = this.statuses.get(a.adapter);
    if (prev?.status === 'UNAVAILABLE') return;
    this.statuses.set(a.adapter, { name: a.name, adapter: a.adapter, status: degradedOnly ? 'DEGRADED' : 'UNAVAILABLE', message: (err as Error).message ?? String(err) });
  }

  isUp(a: AdapterBase): boolean {
    return this.statuses.get(a.adapter)?.status !== 'UNAVAILABLE';
  }

  list(): IntegrationStatus[] {
    return [...this.statuses.values()];
  }
}

function computeHealth(results: TestResult[]): ReleaseHealth {
  const count = (s: TestResult['status']) => results.filter((r) => r.status === s).length;
  const passed = count('passed');
  const skipped = count('skipped');
  const executed = results.length - skipped;
  return {
    total: results.length,
    passed,
    failed: count('failed'),
    broken: count('broken'),
    skipped,
    executed,
    passRate: executed ? round((passed / executed) * 100, 1) : 0,
  };
}

/** Runs the end-to-end triage pipeline for one automation execution and persists the assessment. */
export class AssessmentService {
  private readonly running = new Map<string, Promise<Assessment>>();

  constructor(private readonly deps: AssessmentDeps) {}

  assess(executionId: string): Promise<Assessment> {
    const inflight = this.running.get(executionId);
    if (inflight) return inflight;
    const p = this.run(executionId).finally(() => this.running.delete(executionId));
    this.running.set(executionId, p);
    return p;
  }

  private async run(executionId: string): Promise<Assessment> {
    const { adapters, ai, store } = this.deps;
    const policy = this.deps.policy();
    const startedAt = new Date();
    const integrations = new IntegrationTracker();
    await Promise.all([adapters.results, adapters.testCases, adapters.defects, adapters.revalidation].map((a) => integrations.check(a)));

    // FR-01: collect failures and evidence.
    const execution = await adapters.results.getExecution(executionId);
    const failedResults = execution.results.filter((r) => r.status === 'failed' || r.status === 'broken');
    const keys = [...new Set(failedResults.map((r) => r.testCaseKey).filter((k): k is string => !!k))];

    let testCases = new Map<string, TestCase>();
    if (integrations.isUp(adapters.testCases)) {
      try {
        testCases = new Map((await adapters.testCases.getTestCases(keys)).map((tc) => [tc.key, tc]));
      } catch (err) {
        integrations.fail(adapters.testCases, err);
      }
    }

    // FR-02: historical identification.
    const prepared = failedResults.map((r) => {
      const fingerprint = computeFingerprint(r.testCaseKey, r.errorMessage, r.stackTrace);
      const history = analyzeHistory(store, executionId, r.testCaseKey, fingerprint);
      return { result: r, testCase: r.testCaseKey ? testCases.get(r.testCaseKey) ?? null : null, fingerprint, history };
    });

    const jiraUp = () => integrations.isUp(adapters.defects);
    let historicalIssues = new Map<string, JiraIssue>();
    const linkedKeys = [...new Set(prepared.flatMap((p) => p.history.linkedJiraKeys))];
    if (linkedKeys.length && jiraUp()) {
      try {
        historicalIssues = new Map((await adapters.defects.getIssues(linkedKeys)).map((i) => [i.key, i]));
      } catch (err) {
        integrations.fail(adapters.defects, err);
      }
    }
    let candidates: JiraIssue[] = [];
    if (jiraUp()) {
      try {
        candidates = await adapters.defects.searchIssues({ text: '', testCaseKey: null, components: [], openOnly: true });
      } catch (err) {
        integrations.fail(adapters.defects, err);
      }
    }

    const failures: FailureRecord[] = [];
    for (const p of prepared) {
      const r = p.result;
      const linked = p.history.linkedJiraKeys.map((k) => historicalIssues.get(k)).filter((i): i is JiraIssue => !!i);
      const openLinked = linked.filter((i) => i.statusCategory !== 'Done');
      const sevRank = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'];
      openLinked.sort((a, b) => sevRank.indexOf(a.severity) - sevRank.indexOf(b.severity));

      let category: FailureRecord['category'];
      let jira: FailureRecord['jira'] = null;
      let recurrence: FailureRecord['recurrence'] = p.history.seenBefore ? 'RECURRING' : 'NEW';
      if (openLinked.length) {
        category = 'KNOWN_OPEN_DEFECT';
        jira = {
          issue: openLinked[0],
          score: 1,
          method: 'HISTORICAL_LINK',
          reasons: [`Same failure previously linked to ${openLinked[0].key} in release ${p.history.lastSeenRelease}; defect still ${openLinked[0].status}`],
        };
      } else {
        if (linked.length) recurrence = 'REGRESSION_OF_RESOLVED';
        // FR-03: correlate with existing Jira defects.
        jira = correlateWithJira(
          {
            testCaseKey: r.testCaseKey,
            testName: r.name,
            component: p.testCase?.component ?? r.labels.feature ?? 'Unknown',
            release: execution.release,
            errorMessage: r.errorMessage,
            testCase: p.testCase,
          },
          candidates,
        );
        category = jira ? 'NEW_WITH_JIRA' : 'NEW_NO_JIRA';
      }

      const analysisInput: FailureAnalysisInput = {
        testName: r.name,
        testCaseKey: r.testCaseKey,
        component: p.testCase?.component ?? r.labels.feature ?? 'Unknown',
        businessCritical: p.testCase?.businessCritical ?? false,
        errorMessage: r.errorMessage,
        stackTrace: r.stackTrace,
        scriptPath: p.testCase?.automationScript ?? r.scriptPath,
        testCase: p.testCase,
        history: p.history,
        jira,
        category,
      };
      // FR-04: AI analysis + Playwright MCP validation.
      const initial = await ai.classifyFailure(analysisInput);
      let validation;
      if (category !== 'NEW_NO_JIRA') {
        validation = notRequired(`Failure is tracked by Jira ${jira!.issue.key}; targeted re-execution not required.`);
      } else if (!policy.validation.enabled) {
        validation = notEligible('Playwright re-validation disabled by release policy.');
      } else if (!p.testCase) {
        validation = notEligible(
          integrations.isUp(adapters.testCases) ? 'No Zephyr test case mapped to this script.' : 'Zephyr test case data unavailable.',
        );
      } else if (!p.testCase.playwrightRevalidationApproved) {
        validation = notEligible(`Test case ${p.testCase.key} is not approved for automated Playwright MCP re-execution.`);
      } else if (!integrations.isUp(adapters.revalidation)) {
        validation = { eligible: true, status: 'INCONCLUSIVE' as const, attempts: [], summary: 'Playwright MCP unavailable; re-execution pending.' };
      } else {
        validation = await revalidate(
          adapters.revalidation,
          { executionId, testCase: p.testCase, errorMessage: r.errorMessage, stackTrace: r.stackTrace, originalSignature: p.fingerprint.signature },
          { attempts: policy.validation.attempts, similarityThreshold: policy.validation.reproductionSimilarityThreshold },
        );
        const errored = validation.attempts.find((a) => a.status === 'error');
        if (errored) integrations.fail(adapters.revalidation, new Error(`Re-execution error for ${p.testCase.key}: ${errored.errorMessage}`), true);
      }
      const finalAnalysis = await ai.assessValidation({ failure: analysisInput, initial, validation });
      const waiver = jira ? store.findValidWaiver(jira.issue.key, execution.release, startedAt) : null;

      failures.push({
        id: `${executionId}:${r.testCaseKey ?? r.resultId}`,
        resultId: r.resultId,
        testCaseKey: r.testCaseKey,
        testName: r.name,
        status: r.status,
        component: analysisInput.component,
        businessCritical: analysisInput.businessCritical,
        testPriority: p.testCase?.priority ?? null,
        testCase: p.testCase,
        scriptPath: analysisInput.scriptPath,
        errorMessage: r.errorMessage,
        stackTrace: r.stackTrace,
        attachments: r.attachments,
        fingerprint: p.fingerprint,
        category,
        recurrence,
        history: p.history,
        jira,
        waiver,
        initialAnalysis: initial,
        validation,
        finalAnalysis,
        releaseImpact: 'LOW',
        riskContribution: 0,
        potentialGenuineDefect: false,
      });
    }

    const health = computeHealth(execution.results);
    const integrationList = integrations.list();
    // FR-07: deterministic decision.
    const evaluation = evaluatePolicy(policy, { release: execution.release, health, failures, integrations: integrationList });
    for (const f of failures) {
      Object.assign(f, evaluation.impacts[f.id]);
      f.potentialGenuineDefect = f.category === 'NEW_NO_JIRA' && f.finalAnalysis.classification === 'APPLICATION_DEFECT';
    }
    const categoryCounts = this.countCategories(failures);
    const explanation = await ai.explainDecision({ execution, health, categoryCounts, decision: evaluation.decision });
    const completedAt = new Date();

    const { results: _results, ...executionSummary } = execution;
    const assessment: Assessment = {
      id: newId('asm'),
      createdAt: completedAt.toISOString(),
      execution: executionSummary,
      health,
      failures,
      categoryCounts,
      validationSummary: this.summarizeValidation(failures),
      defects: this.summarizeDefects(failures),
      decision: { ...evaluation.decision, explanation },
      integrations: integrationList,
      audit: {
        model: ai.info,
        policy: evaluation.decision.policy,
        platformVersion: PLATFORM_VERSION,
        analysisStartedAt: startedAt.toISOString(),
        analysisCompletedAt: completedAt.toISOString(),
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
    };
    store.saveAssessment(assessment);
    store.replaceHistoryForExecution(
      executionId,
      failures.map<HistoryRecord>((f) => ({
        executionId,
        release: execution.release,
        build: execution.build,
        executedAt: execution.finishedAt,
        testCaseKey: f.testCaseKey,
        signature: f.fingerprint.signature,
        fingerprint: f.fingerprint.fingerprint,
        normalizedMessage: f.fingerprint.normalizedMessage,
        errorType: f.fingerprint.errorType,
        jiraKey: f.jira?.issue.key ?? null,
        classification: f.finalAnalysis.classification,
      })),
    );
    return assessment;
  }

  private countCategories(failures: FailureRecord[]): CategoryCounts {
    const unlinked = failures.filter((f) => f.category === 'NEW_NO_JIRA');
    const cls = (c: string[]) => unlinked.filter((f) => c.includes(f.finalAnalysis.classification)).length;
    return {
      knownOpenDefects: failures.filter((f) => f.category === 'KNOWN_OPEN_DEFECT').length,
      newWithJira: failures.filter((f) => f.category === 'NEW_WITH_JIRA').length,
      newWithoutJira: unlinked.length,
      potentialGenuineDefects: failures.filter((f) => f.potentialGenuineDefect).length,
      automationOrFlaky: cls(['AUTOMATION_SCRIPT', 'FLAKY', 'TIMING_SYNC']),
      environment: cls(['ENVIRONMENT']),
      testData: cls(['TEST_DATA']),
      inconclusive: cls(['INCONCLUSIVE']),
    };
  }

  private summarizeValidation(failures: FailureRecord[]): ValidationSummary {
    const v = failures.map((f) => f.validation);
    const attempts = v.flatMap((x) => x.attempts);
    const status = (s: string) => v.filter((x) => x.status === s).length;
    return {
      selected: v.filter((x) => x.eligible).length,
      notEligible: status('NOT_ELIGIBLE'),
      reproduced: status('REPRODUCED'),
      intermittent: status('INTERMITTENT'),
      notReproduced: status('NOT_REPRODUCED'),
      differentFailure: status('DIFFERENT_FAILURE'),
      inconclusive: status('INCONCLUSIVE'),
      totalAttempts: attempts.length,
      passedAttempts: attempts.filter((a) => a.status === 'passed').length,
      failedAttempts: attempts.filter((a) => a.status === 'failed').length,
      erroredAttempts: attempts.filter((a) => a.status === 'error').length,
    };
  }

  private summarizeDefects(failures: FailureRecord[]): DefectSummary[] {
    const map = new Map<string, DefectSummary>();
    const rank = { BLOCKING: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    for (const f of failures) {
      if (!f.jira) continue;
      const key = f.jira.issue.key;
      const existing = map.get(key);
      if (existing) {
        existing.failureIds.push(f.id);
        if (f.testCaseKey) existing.linkedTestCases.push(f.testCaseKey);
        if (rank[f.releaseImpact] < rank[existing.releaseImpact]) existing.releaseImpact = f.releaseImpact;
      } else {
        map.set(key, {
          issue: f.jira.issue,
          linkedTestCases: f.testCaseKey ? [f.testCaseKey] : [],
          failureIds: [f.id],
          category: f.category,
          waiver: f.waiver,
          releaseImpact: f.releaseImpact,
        });
      }
    }
    return [...map.values()].sort((a, b) => rank[a.releaseImpact] - rank[b.releaseImpact]);
  }
}
