import type { JiraIssue } from '../../domain/types';
import type { DefectTrackerAdapter, HealthCheckResult, JiraSearchQuery } from '../types';
import { fileHealth, readJsonArray } from '../shared/jsonFile';

/** Jira issues from a JSON export (platform JiraIssue shape). Ranking is done by the correlator. */
export class FileDefectAdapter implements DefectTrackerAdapter {
  readonly name = 'Jira (file export)';
  readonly adapter = 'file-jira';

  constructor(private readonly file: string, private readonly available = true) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.available ? fileHealth(this.file) : { ok: false, message: 'Jira unreachable (simulated outage)' };
  }

  async getIssues(keys: string[]): Promise<JiraIssue[]> {
    this.assertAvailable();
    const wanted = new Set(keys);
    return readJsonArray<JiraIssue>(this.file).filter((i) => wanted.has(i.key));
  }

  async searchIssues(query: JiraSearchQuery): Promise<JiraIssue[]> {
    this.assertAvailable();
    return readJsonArray<JiraIssue>(this.file).filter((i) => !query.openOnly || i.statusCategory !== 'Done');
  }

  private assertAvailable(): void {
    if (!this.available) throw new Error('Jira unreachable (simulated outage)');
  }
}
