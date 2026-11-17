import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { Assessment, AssessmentListItem, FailureClassification, Waiver } from '../domain/types';

export interface HistoryRecord {
  executionId: string;
  release: string;
  build: string;
  executedAt: string;
  testCaseKey: string | null;
  signature: string;
  fingerprint: string;
  normalizedMessage: string;
  errorType: string;
  jiraKey: string | null;
  classification: FailureClassification | null;
}

export interface StoredArtifact {
  id: string;
  name: string;
  contentType: string;
  content: string;
  /** Binary artifacts (e.g. PNG screenshots) are stored base64-encoded. */
  encoding?: 'utf8' | 'base64';
}

export interface ArtifactSink {
  putArtifact(artifact: StoredArtifact): void;
}

export class Store implements ArtifactSink {
  readonly db: Database.Database;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT NOT NULL,
        release TEXT NOT NULL,
        build TEXT NOT NULL,
        executed_at TEXT NOT NULL,
        test_case_key TEXT,
        signature TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        normalized_message TEXT NOT NULL,
        error_type TEXT NOT NULL,
        jira_key TEXT,
        classification TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_history_test ON history_failures(test_case_key);
      CREATE INDEX IF NOT EXISTS idx_history_signature ON history_failures(signature);
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        release TEXT NOT NULL,
        build TEXT NOT NULL,
        environment TEXT NOT NULL,
        created_at TEXT NOT NULL,
        decision TEXT NOT NULL,
        risk_score REAL NOT NULL,
        pass_rate REAL NOT NULL,
        policy_version TEXT NOT NULL,
        policy_hash TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_version TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS waivers (
        id TEXT PRIMARY KEY,
        jira_key TEXT NOT NULL,
        release TEXT NOT NULL,
        approved_by TEXT NOT NULL,
        approver_role TEXT NOT NULL,
        approved_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        justification TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content TEXT NOT NULL
      );
    `);
    const artifactCols = this.db.prepare('PRAGMA table_info(artifacts)').all() as Array<{ name: string }>;
    if (!artifactCols.some((c) => c.name === 'encoding')) {
      this.db.exec("ALTER TABLE artifacts ADD COLUMN encoding TEXT NOT NULL DEFAULT 'utf8'");
    }
  }

  putArtifact(a: StoredArtifact): void {
    this.db
      .prepare('INSERT OR REPLACE INTO artifacts (id, name, content_type, content, encoding) VALUES (?, ?, ?, ?, ?)')
      .run(a.id, a.name, a.contentType, a.content, a.encoding ?? 'utf8');
  }

  getArtifact(id: string): StoredArtifact | undefined {
    const row = this.db.prepare('SELECT id, name, content_type, content, encoding FROM artifacts WHERE id = ?').get(id) as
      | { id: string; name: string; content_type: string; content: string; encoding: 'utf8' | 'base64' }
      | undefined;
    return row && { id: row.id, name: row.name, contentType: row.content_type, content: row.content, encoding: row.encoding };
  }

  private mapHistory(row: Record<string, unknown>): HistoryRecord {
    return {
      executionId: row.execution_id as string,
      release: row.release as string,
      build: row.build as string,
      executedAt: row.executed_at as string,
      testCaseKey: (row.test_case_key as string | null) ?? null,
      signature: row.signature as string,
      fingerprint: row.fingerprint as string,
      normalizedMessage: row.normalized_message as string,
      errorType: row.error_type as string,
      jiraKey: (row.jira_key as string | null) ?? null,
      classification: (row.classification as FailureClassification | null) ?? null,
    };
  }

  historyForTest(testCaseKey: string, excludeExecutionId: string): HistoryRecord[] {
    return (
      this.db
        .prepare('SELECT * FROM history_failures WHERE test_case_key = ? AND execution_id != ? ORDER BY executed_at')
        .all(testCaseKey, excludeExecutionId) as Record<string, unknown>[]
    ).map((r) => this.mapHistory(r));
  }

  historyBySignature(signature: string, excludeExecutionId: string): HistoryRecord[] {
    return (
      this.db
        .prepare('SELECT * FROM history_failures WHERE signature = ? AND execution_id != ? ORDER BY executed_at')
        .all(signature, excludeExecutionId) as Record<string, unknown>[]
    ).map((r) => this.mapHistory(r));
  }

  historyCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS c FROM history_failures').get() as { c: number }).c;
  }

  replaceHistoryForExecution(executionId: string, records: HistoryRecord[]): void {
    const del = this.db.prepare('DELETE FROM history_failures WHERE execution_id = ?');
    const ins = this.db.prepare(`INSERT INTO history_failures
      (execution_id, release, build, executed_at, test_case_key, signature, fingerprint, normalized_message, error_type, jira_key, classification)
      VALUES (@executionId, @release, @build, @executedAt, @testCaseKey, @signature, @fingerprint, @normalizedMessage, @errorType, @jiraKey, @classification)`);
    this.db.transaction(() => {
      del.run(executionId);
      for (const r of records) ins.run(r);
    })();
  }

  listWaivers(): Waiver[] {
    return (this.db.prepare('SELECT * FROM waivers ORDER BY approved_at').all() as Record<string, string>[]).map((r) => ({
      id: r.id,
      jiraKey: r.jira_key,
      release: r.release,
      approvedBy: r.approved_by,
      approverRole: r.approver_role,
      approvedAt: r.approved_at,
      expiresAt: r.expires_at,
      justification: r.justification,
    }));
  }

  addWaiver(w: Waiver): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO waivers (id, jira_key, release, approved_by, approver_role, approved_at, expires_at, justification)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(w.id, w.jiraKey, w.release, w.approvedBy, w.approverRole, w.approvedAt, w.expiresAt, w.justification);
  }

  /** A waiver is valid when it targets the release, was approved before `at` and has not expired. */
  findValidWaiver(jiraKey: string, release: string, at: Date): Waiver | null {
    const t = at.getTime();
    return (
      this.listWaivers()
        .filter(
          (w) =>
            w.jiraKey === jiraKey &&
            w.release === release &&
            Date.parse(w.approvedAt) <= t &&
            Date.parse(w.expiresAt) >= t,
        )
        .pop() ?? null
    );
  }

  saveAssessment(a: Assessment): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO assessments
        (id, execution_id, release, build, environment, created_at, decision, risk_score, pass_rate, policy_version, policy_hash, model_provider, model_name, model_version, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        a.id,
        a.execution.executionId,
        a.execution.release,
        a.execution.build,
        a.execution.environment,
        a.createdAt,
        a.decision.decision,
        a.decision.riskScore,
        a.health.passRate,
        a.audit.policy.version,
        a.audit.policy.hash,
        a.audit.model.provider,
        a.audit.model.model,
        a.audit.model.version,
        JSON.stringify(a),
      );
  }

  getAssessment(id: string): Assessment | undefined {
    const row = this.db.prepare('SELECT payload FROM assessments WHERE id = ?').get(id) as { payload: string } | undefined;
    return row && (JSON.parse(row.payload) as Assessment);
  }

  latestAssessment(): Assessment | undefined {
    const row = this.db
      .prepare('SELECT payload FROM assessments ORDER BY created_at DESC, rowid DESC LIMIT 1')
      .get() as { payload: string } | undefined;
    return row && (JSON.parse(row.payload) as Assessment);
  }

  listAssessments(): AssessmentListItem[] {
    return (
      this.db
        .prepare(
          `SELECT id, execution_id, release, build, environment, created_at, decision, risk_score, pass_rate, policy_version
           FROM assessments ORDER BY created_at DESC, rowid DESC`,
        )
        .all() as Record<string, string | number>[]
    ).map((r) => ({
      id: r.id as string,
      executionId: r.execution_id as string,
      release: r.release as string,
      build: r.build as string,
      environment: r.environment as string,
      createdAt: r.created_at as string,
      decision: r.decision as AssessmentListItem['decision'],
      riskScore: r.risk_score as number,
      passRate: r.pass_rate as number,
      policyVersion: r.policy_version as string,
    }));
  }

  hasAssessmentForExecution(executionId: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM assessments WHERE execution_id = ? LIMIT 1').get(executionId);
  }

  close(): void {
    this.db.close();
  }
}
