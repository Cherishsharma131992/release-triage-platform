import type { Execution, ExecutionSummary, JiraIssue, TestCase, Attachment } from '../domain/types';

export interface HealthCheckResult {
  ok: boolean;
  message?: string;
}

export interface AdapterBase {
  readonly name: string;
  readonly adapter: string;
  healthCheck(): Promise<HealthCheckResult>;
}

/** Automation results source (e.g. Allure). */
export interface AutomationResultsAdapter extends AdapterBase {
  listExecutions(): Promise<ExecutionSummary[]>;
  getExecution(executionId: string): Promise<Execution>;
}

/** Test case management (e.g. Zephyr Scale). */
export interface TestCaseManagementAdapter extends AdapterBase {
  getTestCases(keys: string[]): Promise<TestCase[]>;
}

export interface JiraSearchQuery {
  text: string;
  testCaseKey: string | null;
  components: string[];
  openOnly: boolean;
}

/** Defect tracker (e.g. Jira Cloud). */
export interface DefectTrackerAdapter extends AdapterBase {
  getIssues(keys: string[]): Promise<JiraIssue[]>;
  searchIssues(query: JiraSearchQuery): Promise<JiraIssue[]>;
}

export interface RevalidationRequest {
  executionId: string;
  testCase: TestCase;
  attempt: number;
  originalErrorMessage: string | null;
  originalStackTrace: string | null;
}

export interface RevalidationRun {
  status: 'passed' | 'failed';
  durationMs: number;
  errorMessage: string | null;
  stackTrace: string | null;
  attachments: Attachment[];
}

/** Targeted re-execution (e.g. Playwright MCP). Throws when the run itself could not be executed. */
export interface RevalidationAdapter extends AdapterBase {
  runTestCase(request: RevalidationRequest): Promise<RevalidationRun>;
}

export interface Adapters {
  results: AutomationResultsAdapter;
  testCases: TestCaseManagementAdapter;
  defects: DefectTrackerAdapter;
  revalidation: RevalidationAdapter;
}
