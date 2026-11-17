import type { JiraIssue } from '../../domain/types';
import type { DefectTrackerAdapter, HealthCheckResult, JiraSearchQuery } from '../types';
import { JIRA_ISSUES } from './data/jiraIssues';

export class MockJiraAdapter implements DefectTrackerAdapter {
  readonly name = 'Jira Cloud';
  readonly adapter = 'mock-jira-cloud';

  constructor(private readonly available = true, private readonly issues: JiraIssue[] = JIRA_ISSUES) {}

  async healthCheck(): Promise<HealthCheckResult> {
    return this.available ? { ok: true } : { ok: false, message: 'Jira Cloud REST API unreachable (mock outage)' };
  }

  async getIssues(keys: string[]): Promise<JiraIssue[]> {
    this.assertAvailable();
    const wanted = new Set(keys);
    return this.issues.filter((i) => wanted.has(i.key)).map((i) => ({ ...i }));
  }

  /** Approximates `project = SHOP AND issuetype = Bug [AND statusCategory != Done]`; ranking is done by the correlator. */
  async searchIssues(query: JiraSearchQuery): Promise<JiraIssue[]> {
    this.assertAvailable();
    return this.issues
      .filter((i) => i.issueType === 'Bug')
      .filter((i) => !query.openOnly || i.statusCategory !== 'Done')
      .map((i) => ({ ...i }));
  }

  private assertAvailable(): void {
    if (!this.available) throw new Error('Jira Cloud REST API unreachable (mock outage)');
  }
}
