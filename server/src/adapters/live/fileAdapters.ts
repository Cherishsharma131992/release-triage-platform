import fs from 'fs';
import type { JiraIssue, TestCase } from '../../domain/types';
import type { DefectTrackerAdapter, HealthCheckResult, JiraSearchQuery, TestCaseManagementAdapter } from '../types';

function readJsonArray<T>(file: string): T[] {
  if (!fs.existsSync(file)) throw new Error(`${file} does not exist`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  if (!Array.isArray(data)) throw new Error(`${file} must contain a JSON array`);
  return data as T[];
}

const fileHealth = (file: string): HealthCheckResult => (fs.existsSync(file) ? { ok: true } : { ok: false, message: `${file} does not exist` });

/** Test cases from a JSON export (platform TestCase shape). Re-read on every call so edits apply immediately. */
export class FileTestCaseAdapter implements TestCaseManagementAdapter {
  readonly name = 'Zephyr (file export)';
  readonly adapter = 'file-zephyr';

  constructor(private readonly file: string) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return fileHealth(this.file);
  }

  async getTestCases(keys: string[]): Promise<TestCase[]> {
    const wanted = new Set(keys);
    return readJsonArray<TestCase>(this.file).filter((tc) => wanted.has(tc.key));
  }
}

/** Jira issues from a JSON export (platform JiraIssue shape). Ranking is done by the correlator. */
export class FileDefectAdapter implements DefectTrackerAdapter {
  readonly name = 'Jira (file export)';
  readonly adapter = 'file-jira';

  constructor(private readonly file: string) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return fileHealth(this.file);
  }

  async getIssues(keys: string[]): Promise<JiraIssue[]> {
    const wanted = new Set(keys);
    return readJsonArray<JiraIssue>(this.file).filter((i) => wanted.has(i.key));
  }

  async searchIssues(query: JiraSearchQuery): Promise<JiraIssue[]> {
    return readJsonArray<JiraIssue>(this.file).filter((i) => !query.openOnly || i.statusCategory !== 'Done');
  }
}
