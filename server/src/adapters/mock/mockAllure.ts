import type { Attachment, Execution, ExecutionSummary, TestResult } from '../../domain/types';
import type { ArtifactSink } from '../../store/store';
import type { AutomationResultsAdapter, HealthCheckResult } from '../types';
import { renderScreenshotSvg, renderTrace } from './artifacts';
import { EXECUTION_SEEDS, FAILURE_LIBRARY, type ExecutionSeed } from './data/failures';
import { TEST_CASES } from './data/testCases';

/** Shape of an Allure `*-result.json` entry (subset). */
export interface AllureResult {
  uuid: string;
  name: string;
  fullName: string;
  status: 'passed' | 'failed' | 'broken' | 'skipped';
  statusDetails?: { message?: string; trace?: string };
  labels: Array<{ name: string; value: string }>;
  links: Array<{ type: string; name: string; url: string }>;
  attachments: Array<{ name: string; source: string; type: string }>;
  start: number;
  stop: number;
}

function attachmentKind(type: string, name: string): Attachment['kind'] {
  if (type.startsWith('image/')) return 'screenshot';
  if (name.toLowerCase().includes('trace')) return 'trace';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('text/')) return 'log';
  return 'other';
}

/** Maps an Allure result to the platform's TestResult model. */
export function mapAllureResult(r: AllureResult): TestResult {
  const label = (n: string) => r.labels.find((l) => l.name === n)?.value;
  const tms = r.links.find((l) => l.type === 'tms');
  return {
    resultId: r.uuid,
    testCaseKey: tms?.name ?? label('AS_ID') ?? null,
    name: r.name,
    fullName: r.fullName,
    status: r.status,
    scriptPath: label('testSource') ?? null,
    errorMessage: r.statusDetails?.message ?? null,
    stackTrace: r.statusDetails?.trace ?? null,
    durationMs: r.stop - r.start,
    attachments: r.attachments.map((a) => ({
      id: a.source,
      name: a.name,
      contentType: a.type,
      kind: attachmentKind(a.type, a.name),
    })),
    labels: Object.fromEntries(r.labels.map((l) => [l.name, l.value])),
  };
}

export class MockAllureAdapter implements AutomationResultsAdapter {
  readonly name = 'Automation Framework (Allure)';
  readonly adapter = 'mock-allure';

  constructor(private readonly artifacts: ArtifactSink, private readonly available = true) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.available ? { ok: true } : { ok: false, message: 'Allure report server unreachable (mock outage)' };
  }

  async listExecutions(): Promise<ExecutionSummary[]> {
    this.assertAvailable();
    return EXECUTION_SEEDS.map((s) => this.summary(s));
  }

  async getExecution(executionId: string): Promise<Execution> {
    this.assertAvailable();
    const seed = EXECUTION_SEEDS.find((s) => s.executionId === executionId);
    if (!seed) throw new Error(`Execution ${executionId} not found in Allure`);
    const results = this.buildAllureResults(seed).map(mapAllureResult);
    return { ...this.summary(seed), results };
  }

  private assertAvailable(): void {
    if (!this.available) throw new Error('Allure report server unreachable (mock outage)');
  }

  private summary(s: ExecutionSeed): ExecutionSummary {
    return {
      executionId: s.executionId,
      release: s.release,
      build: s.build,
      environment: s.environment,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      triggeredBy: 'GitHub Actions • nightly-regression',
      ciJobUrl: `https://ci.example.com/shop-e2e/runs/${s.build}`,
    };
  }

  private buildAllureResults(seed: ExecutionSeed): AllureResult[] {
    let clock = Date.parse(seed.startedAt);
    return TEST_CASES.map((tc, idx) => {
      const failure = seed.failing.includes(tc.key) ? FAILURE_LIBRARY[tc.key] : undefined;
      const skipped = seed.skipped.includes(tc.key);
      const duration = 8_000 + ((idx * 7919) % 40_000);
      const start = clock;
      clock += duration;
      const uuid = `${seed.executionId}-${tc.key}`;
      const attachments: AllureResult['attachments'] = [];
      if (failure) {
        const shot = `${uuid}-screenshot.svg`;
        const log = `${uuid}-console.log`;
        const trace = `${uuid}-trace.json`;
        this.artifacts.putArtifact({
          id: shot,
          name: 'failure-screenshot.svg',
          contentType: 'image/svg+xml',
          content: renderScreenshotSvg(tc.name, `${seed.build} • ${seed.environment} • original run`, failure.errorMessage, false),
        });
        this.artifacts.putArtifact({
          id: log,
          name: 'console.log',
          contentType: 'text/plain',
          content: [
            `[${new Date(start).toISOString()}] ▶ ${tc.key} ${tc.name}`,
            ...tc.steps.slice(0, 3).map((s) => `[step ${s.index}] ${s.action}`),
            `[ERROR] ${failure.errorMessage}`,
            failure.stackTrace,
          ].join('\n'),
        });
        this.artifacts.putArtifact({
          id: trace,
          name: 'trace.json',
          contentType: 'application/json',
          content: renderTrace(tc.name, tc.steps.map((s) => s.action), 3),
        });
        attachments.push(
          { name: 'Screenshot on failure', source: shot, type: 'image/svg+xml' },
          { name: 'Console log', source: log, type: 'text/plain' },
          { name: 'Playwright trace', source: trace, type: 'application/json' },
        );
      }
      return {
        uuid,
        name: tc.name,
        fullName: `${tc.automationScript} › ${tc.name}`,
        status: failure ? failure.status : skipped ? 'skipped' : 'passed',
        statusDetails: failure ? { message: failure.errorMessage, trace: failure.stackTrace } : undefined,
        labels: [
          { name: 'feature', value: tc.component },
          { name: 'testSource', value: tc.automationScript },
          { name: 'host', value: 'runner-07' },
        ],
        links: [{ type: 'tms', name: tc.key, url: `https://example.atlassian.net/projects/SHOP?selectedItem=com.atlassian.plugins.atlassian-connect-plugin:com.kanoah.test-manager__main-project-page#!/testCase/${tc.key}` }],
        attachments,
        start,
        stop: start + duration,
      };
    });
  }
}
