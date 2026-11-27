import type { JiraIssue, JiraPriority, JiraSeverity, JiraStatusCategory } from '../../domain/types';
import type { DefectTrackerAdapter, HealthCheckResult, JiraSearchQuery } from '../types';
import { HttpClient, requireEnv } from '../shared/http';

export interface JiraCloudConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projects: string[];
  issueTypes: string[];
  /** Custom field holding severity (e.g. customfield_10050). Falls back to priority when unset. */
  severityField: string | null;
  /** Regex used to find Zephyr test case keys in labels/summary (e.g. SHOP-T\d+). */
  testCaseKeyPattern: string;
  maxResults: number;
  fetchImpl?: typeof fetch;
}

export function jiraConfigFromEnv(env: NodeJS.ProcessEnv): JiraCloudConfig {
  return {
    baseUrl: requireEnv(env, 'JIRA_BASE_URL'),
    email: requireEnv(env, 'JIRA_EMAIL'),
    apiToken: requireEnv(env, 'JIRA_API_TOKEN'),
    projects: requireEnv(env, 'JIRA_PROJECT_KEYS').split(',').map((s) => s.trim()).filter(Boolean),
    issueTypes: (env.JIRA_BUG_ISSUE_TYPES ?? 'Bug').split(',').map((s) => s.trim()).filter(Boolean),
    severityField: env.JIRA_SEVERITY_FIELD?.trim() || null,
    testCaseKeyPattern: env.ZEPHYR_TEST_CASE_KEY_PATTERN ?? '[A-Z][A-Z0-9]+-T\\d+',
    maxResults: Number(env.JIRA_MAX_RESULTS ?? 100),
  };
}

interface JiraApiIssue {
  key: string;
  fields: Record<string, unknown> & {
    summary?: string;
    description?: unknown;
    issuetype?: { name?: string };
    status?: { name?: string; statusCategory?: { key?: string } };
    priority?: { name?: string } | null;
    components?: Array<{ name: string }>;
    labels?: string[];
    versions?: Array<{ name: string }>;
    fixVersions?: Array<{ name: string }>;
    created?: string;
    updated?: string;
    resolutiondate?: string | null;
  };
}

const PRIORITIES: JiraPriority[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const SEVERITIES: JiraSeverity[] = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'];
const PRIORITY_TO_SEVERITY: Record<JiraPriority, JiraSeverity> = {
  Highest: 'Blocker',
  High: 'Critical',
  Medium: 'Major',
  Low: 'Minor',
  Lowest: 'Trivial',
};

/** Flattens Atlassian Document Format (or plain strings) into text. */
export function adfToText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join('');
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === 'text') return n.text ?? '';
  if (n.type === 'hardBreak') return '\n';
  const inner = adfToText(n.content ?? []);
  return ['paragraph', 'heading', 'codeBlock', 'listItem', 'blockquote'].includes(n.type ?? '') ? `${inner}\n` : inner;
}

function normalizePriority(name: string | undefined): JiraPriority {
  const match = PRIORITIES.find((p) => p.toLowerCase() === (name ?? '').toLowerCase());
  if (match) return match;
  if (/block|critical|p0|p1/i.test(name ?? '')) return 'Highest';
  if (/major|p2/i.test(name ?? '')) return 'High';
  if (/minor|p4/i.test(name ?? '')) return 'Low';
  return 'Medium';
}

function normalizeSeverity(raw: unknown, priority: JiraPriority): JiraSeverity {
  const value = typeof raw === 'string' ? raw : (raw as { value?: string; name?: string } | null)?.value ?? (raw as { name?: string } | null)?.name;
  if (value) {
    const match = SEVERITIES.find((s) => value.toLowerCase().includes(s.toLowerCase()));
    if (match) return match;
    if (/^s?1\b|sev ?1/i.test(value)) return 'Critical';
    if (/^s?2\b|sev ?2/i.test(value)) return 'Major';
    if (/^s?3\b|sev ?3/i.test(value)) return 'Minor';
  }
  return PRIORITY_TO_SEVERITY[priority];
}

function statusCategory(key: string | undefined): JiraStatusCategory {
  if (key === 'done') return 'Done';
  if (key === 'indeterminate') return 'In Progress';
  return 'To Do';
}

const jqlString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** Jira Cloud REST API v3 (enhanced JQL search). Auth: account email + API token (basic). */
export class JiraCloudAdapter implements DefectTrackerAdapter {
  readonly name = 'Jira Cloud';
  readonly adapter = 'jira-cloud';
  private readonly http: HttpClient;

  constructor(private readonly cfg: JiraCloudConfig) {
    this.http = new HttpClient({
      baseUrl: cfg.baseUrl,
      headers: { Authorization: `Basic ${Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString('base64')}` },
      fetchImpl: cfg.fetchImpl,
    });
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.http.get('/rest/api/3/myself');
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  }

  async getIssues(keys: string[]): Promise<JiraIssue[]> {
    if (!keys.length) return [];
    return this.search(`key in (${keys.map(jqlString).join(',')})`, keys.length);
  }

  /** Returns candidate bugs; ranking happens in the correlator. */
  async searchIssues(query: JiraSearchQuery): Promise<JiraIssue[]> {
    const scope = [
      `project in (${this.cfg.projects.map(jqlString).join(',')})`,
      `issuetype in (${this.cfg.issueTypes.map(jqlString).join(',')})`,
      query.openOnly ? 'statusCategory != Done' : null,
    ].filter(Boolean).join(' AND ');
    const jql = query.testCaseKey ? `(${scope}) OR (labels = ${jqlString(query.testCaseKey)})` : scope;
    return this.search(`${jql} ORDER BY updated DESC`, this.cfg.maxResults);
  }

  private async search(jql: string, max: number): Promise<JiraIssue[]> {
    const fields = ['summary', 'description', 'issuetype', 'status', 'priority', 'components', 'labels', 'versions', 'fixVersions', 'created', 'updated', 'resolutiondate'];
    if (this.cfg.severityField) fields.push(this.cfg.severityField);
    const out: JiraIssue[] = [];
    let nextPageToken: string | undefined;
    do {
      const page = await this.http.get<{ issues: JiraApiIssue[]; nextPageToken?: string; isLast?: boolean }>('/rest/api/3/search/jql', {
        jql,
        fields: fields.join(','),
        maxResults: Math.min(100, max - out.length),
        nextPageToken,
      });
      out.push(...page.issues.map((i) => this.map(i)));
      nextPageToken = page.isLast === false ? page.nextPageToken : undefined;
    } while (nextPageToken && out.length < max);
    return out;
  }

  map(i: JiraApiIssue): JiraIssue {
    const f = i.fields;
    const priority = normalizePriority(f.priority?.name);
    const summary = f.summary ?? '';
    const labels = f.labels ?? [];
    const keyRe = new RegExp(`\\b${this.cfg.testCaseKeyPattern}\\b`, 'g');
    const linked = new Set([...labels.join(' ').matchAll(keyRe), ...summary.matchAll(keyRe)].map((m) => m[0]));
    return {
      key: i.key,
      summary,
      description: adfToText(f.description).trim(),
      issueType: f.issuetype?.name ?? 'Bug',
      status: f.status?.name ?? 'Unknown',
      statusCategory: statusCategory(f.status?.statusCategory?.key),
      severity: normalizeSeverity(this.cfg.severityField ? f[this.cfg.severityField] : null, priority),
      priority,
      components: (f.components ?? []).map((c) => c.name),
      labels,
      affectsVersions: (f.versions ?? []).map((v) => v.name),
      fixVersions: (f.fixVersions ?? []).map((v) => v.name),
      linkedTestCases: [...linked],
      created: f.created ?? new Date(0).toISOString(),
      updated: f.updated ?? f.created ?? new Date(0).toISOString(),
      resolutionDate: f.resolutiondate ?? null,
      url: `${this.cfg.baseUrl.replace(/\/+$/, '')}/browse/${i.key}`,
    };
  }
}
