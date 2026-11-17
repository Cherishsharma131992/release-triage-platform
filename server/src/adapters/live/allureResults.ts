import fs from 'fs';
import path from 'path';
import type { Execution, ExecutionSummary, TestResult } from '../../domain/types';
import type { ArtifactSink } from '../../store/store';
import { mapAllureResult, type AllureResult } from '../mock/mockAllure';
import type { AutomationResultsAdapter, HealthCheckResult } from '../types';

interface AllureStep {
  attachments?: AllureResult['attachments'];
  steps?: AllureStep[];
}

type RawResult = AllureResult & { historyId?: string; steps?: AllureStep[] };

interface Executor {
  name?: string;
  buildName?: string;
  buildUrl?: string;
  url?: string;
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const TEXT_TYPES = /^(text\/|application\/(json|xml|x-ndjson))/;

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function parseProperties(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([^#!][^=:]*?)\s*[=:]\s*(.*)$/.exec(line);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const pick = (props: Record<string, string>, ...keys: string[]) => {
  const lower = Object.fromEntries(Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) if (lower[k.toLowerCase()]) return lower[k.toLowerCase()];
  return undefined;
};

const collectStepAttachments = (steps: AllureStep[] = []): AllureResult['attachments'] =>
  steps.flatMap((s) => [...(s.attachments ?? []), ...collectStepAttachments(s.steps)]);

/**
 * Reads Allure 2 `allure-results` directories produced by CI.
 * ALLURE_RESULTS_DIR holds one sub-directory per execution (or is itself a single execution).
 * Release/environment come from environment.properties (RELEASE / ENVIRONMENT), build from executor.json.
 */
export class AllureResultsDirAdapter implements AutomationResultsAdapter {
  readonly name = 'Automation Framework (Allure)';
  readonly adapter = 'allure-results-dir';

  constructor(private readonly root: string, private readonly artifacts: ArtifactSink) {}

  async healthCheck(): Promise<HealthCheckResult> {
    if (!fs.existsSync(this.root)) return { ok: false, message: `ALLURE_RESULTS_DIR ${this.root} does not exist` };
    return { ok: true };
  }

  private executionDirs(): string[] {
    if (!fs.existsSync(this.root)) throw new Error(`ALLURE_RESULTS_DIR ${this.root} does not exist`);
    const hasResults = (dir: string) => fs.readdirSync(dir).some((f) => f.endsWith('-result.json'));
    if (hasResults(this.root)) return [this.root];
    return fs
      .readdirSync(this.root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && hasResults(path.join(this.root, d.name)))
      .map((d) => path.join(this.root, d.name));
  }

  async listExecutions(): Promise<ExecutionSummary[]> {
    return this.executionDirs()
      .map((dir) => this.summarize(dir, this.readResults(dir)))
      .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  }

  async getExecution(executionId: string): Promise<Execution> {
    const dir = this.executionDirs().find((d) => path.basename(d) === executionId);
    if (!dir) throw new Error(`Execution ${executionId} not found`);
    const raw = this.readResults(dir);
    return { ...this.summarize(dir, raw), results: raw.map((r) => this.toResult(executionId, dir, r)) };
  }

  /** Keeps only the last attempt per test when Allure recorded retries. */
  private readResults(dir: string): RawResult[] {
    const latest = new Map<string, RawResult>();
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('-result.json'))) {
      const r = readJson<RawResult>(path.join(dir, f));
      if (!r?.uuid) continue;
      const key = r.historyId ?? r.fullName ?? r.uuid;
      const prev = latest.get(key);
      if (!prev || (r.stop ?? 0) > (prev.stop ?? 0)) latest.set(key, r);
    }
    return [...latest.values()];
  }

  private summarize(dir: string, raw: RawResult[]): ExecutionSummary {
    const executionId = path.basename(dir);
    const envFile = path.join(dir, 'environment.properties');
    const props = fs.existsSync(envFile) ? parseProperties(fs.readFileSync(envFile, 'utf8')) : {};
    const executor = readJson<Executor>(path.join(dir, 'executor.json')) ?? {};
    const starts = raw.map((r) => r.start).filter(Boolean);
    const stops = raw.map((r) => r.stop).filter(Boolean);
    const iso = (n: number | undefined) => new Date(n ?? fs.statSync(dir).mtimeMs).toISOString();
    return {
      executionId,
      release: pick(props, 'release', 'release.version', 'app.version', 'version') ?? 'unknown',
      build: pick(props, 'build') ?? executor.buildName ?? executionId,
      environment: pick(props, 'environment', 'env', 'stage') ?? 'unknown',
      startedAt: iso(starts.length ? Math.min(...starts) : undefined),
      finishedAt: iso(stops.length ? Math.max(...stops) : undefined),
      triggeredBy: executor.name ?? pick(props, 'triggeredBy', 'triggered.by') ?? 'CI',
      ciJobUrl: executor.buildUrl ?? executor.url ?? null,
    };
  }

  private toResult(executionId: string, dir: string, r: RawResult): TestResult {
    const all = [...(r.attachments ?? []), ...collectStepAttachments(r.steps)];
    const mapped = mapAllureResult({ ...r, labels: r.labels ?? [], links: r.links ?? [], attachments: all });
    mapped.attachments = mapped.attachments.flatMap((a) => {
      const file = path.join(dir, path.basename(a.id));
      if (!fs.existsSync(file) || fs.statSync(file).size > MAX_ATTACHMENT_BYTES) return [];
      const id = `${executionId}/${path.basename(a.id)}`;
      const text = TEXT_TYPES.test(a.contentType);
      this.artifacts.putArtifact({
        id,
        name: a.name,
        contentType: a.contentType,
        content: fs.readFileSync(file).toString(text ? 'utf8' : 'base64'),
        encoding: text ? 'utf8' : 'base64',
      });
      return [{ ...a, id }];
    });
    return mapped;
  }
}
