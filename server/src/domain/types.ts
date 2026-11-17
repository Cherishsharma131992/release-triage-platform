export type TestStatus = 'passed' | 'failed' | 'broken' | 'skipped';

export type AttachmentKind = 'screenshot' | 'log' | 'trace' | 'video' | 'other';

export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  kind: AttachmentKind;
}

export interface ExecutionSummary {
  executionId: string;
  release: string;
  build: string;
  environment: string;
  startedAt: string;
  finishedAt: string;
  triggeredBy: string;
  ciJobUrl: string | null;
}

export interface TestResult {
  resultId: string;
  testCaseKey: string | null;
  name: string;
  fullName: string;
  status: TestStatus;
  scriptPath: string | null;
  errorMessage: string | null;
  stackTrace: string | null;
  durationMs: number;
  attachments: Attachment[];
  labels: Record<string, string>;
}

export interface Execution extends ExecutionSummary {
  results: TestResult[];
}

export type TestCasePriority = 'Critical' | 'High' | 'Normal' | 'Low';

export interface TestStep {
  index: number;
  action: string;
  expected: string;
}

export interface TestCase {
  key: string;
  name: string;
  objective: string;
  component: string;
  priority: TestCasePriority;
  businessCritical: boolean;
  steps: TestStep[];
  automationScript: string;
  playwrightRevalidationApproved: boolean;
  labels: string[];
}

export type JiraStatusCategory = 'To Do' | 'In Progress' | 'Done';
export type JiraSeverity = 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial';
export type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  status: string;
  statusCategory: JiraStatusCategory;
  severity: JiraSeverity;
  priority: JiraPriority;
  components: string[];
  labels: string[];
  affectsVersions: string[];
  fixVersions: string[];
  linkedTestCases: string[];
  created: string;
  updated: string;
  resolutionDate: string | null;
  url: string;
}

export interface Waiver {
  id: string;
  jiraKey: string;
  release: string;
  approvedBy: string;
  approverRole: string;
  approvedAt: string;
  expiresAt: string;
  justification: string;
}

export type FailureCategory = 'KNOWN_OPEN_DEFECT' | 'NEW_WITH_JIRA' | 'NEW_NO_JIRA';

export type FailureClassification =
  | 'APPLICATION_DEFECT'
  | 'AUTOMATION_SCRIPT'
  | 'ENVIRONMENT'
  | 'TEST_DATA'
  | 'TIMING_SYNC'
  | 'FLAKY'
  | 'INCONCLUSIVE';

export const FAILURE_CLASSIFICATIONS: FailureClassification[] = [
  'APPLICATION_DEFECT',
  'AUTOMATION_SCRIPT',
  'ENVIRONMENT',
  'TEST_DATA',
  'TIMING_SYNC',
  'FLAKY',
  'INCONCLUSIVE',
];

export type Recurrence = 'NEW' | 'RECURRING' | 'REGRESSION_OF_RESOLVED';

export type ReproductionStatus =
  | 'REPRODUCED'
  | 'INTERMITTENT'
  | 'NOT_REPRODUCED'
  | 'DIFFERENT_FAILURE'
  | 'INCONCLUSIVE'
  | 'NOT_ELIGIBLE'
  | 'NOT_REQUIRED';

export type ReleaseImpact = 'BLOCKING' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Decision = 'GO' | 'NO_GO' | 'HOLD';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Fingerprint {
  signature: string;
  fingerprint: string;
  errorType: string;
  normalizedMessage: string;
  topFrames: string[];
}

export type HistoricalMatchType = 'EXACT_FINGERPRINT' | 'SIMILAR_ERROR' | 'SAME_SIGNATURE_OTHER_TEST';

export interface HistoricalMatch {
  executionId: string;
  release: string;
  build: string;
  executedAt: string;
  testCaseKey: string | null;
  matchType: HistoricalMatchType;
  similarity: number;
  jiraKey: string | null;
  classification: FailureClassification | null;
}

export interface HistoryAnalysis {
  seenBefore: boolean;
  occurrences: number;
  firstSeenRelease: string | null;
  lastSeenRelease: string | null;
  matches: HistoricalMatch[];
  linkedJiraKeys: string[];
  previousClassifications: Partial<Record<FailureClassification, number>>;
}

export type JiraMatchMethod = 'HISTORICAL_LINK' | 'TEST_CASE_LINK' | 'SEMANTIC';

export interface JiraMatch {
  issue: JiraIssue;
  score: number;
  method: JiraMatchMethod;
  reasons: string[];
}

export interface ModelInfo {
  provider: string;
  model: string;
  version: string;
}

export interface AIClassification {
  classification: FailureClassification;
  confidence: number;
  rootCause: string;
  reasoning: string[];
  signals: string[];
  recommendedAction: string;
  analyzedBy: ModelInfo;
  analyzedAt: string;
}

export interface ValidationAttempt {
  attempt: number;
  status: 'passed' | 'failed' | 'error';
  durationMs: number;
  errorMessage: string | null;
  signature: string | null;
  similarityToOriginal: number | null;
  attachments: Attachment[];
  executedAt: string;
}

export interface ValidationResult {
  eligible: boolean;
  status: ReproductionStatus;
  attempts: ValidationAttempt[];
  summary: string;
}

export interface FailureRecord {
  id: string;
  resultId: string;
  testCaseKey: string | null;
  testName: string;
  status: TestStatus;
  component: string;
  businessCritical: boolean;
  testPriority: TestCasePriority | null;
  testCase: TestCase | null;
  scriptPath: string | null;
  errorMessage: string | null;
  stackTrace: string | null;
  attachments: Attachment[];
  fingerprint: Fingerprint;
  category: FailureCategory;
  recurrence: Recurrence;
  history: HistoryAnalysis;
  jira: JiraMatch | null;
  waiver: Waiver | null;
  initialAnalysis: AIClassification;
  validation: ValidationResult;
  finalAnalysis: AIClassification;
  releaseImpact: ReleaseImpact;
  riskContribution: number;
  potentialGenuineDefect: boolean;
}

export interface CriterionResult {
  ruleId: string;
  name: string;
  description: string;
  mandatory: boolean;
  passed: boolean;
  outcomeIfFailed: Exclude<Decision, 'GO'>;
  details: string;
  evidence: string[];
  policyRef: string;
}

export interface PolicyRef {
  name: string;
  version: string;
  hash: string;
}

export interface ReleaseDecision {
  decision: Decision;
  riskScore: number;
  riskLevel: RiskLevel;
  criteria: CriterionResult[];
  blockers: string[];
  outstandingValidations: string[];
  acceptedRisks: string[];
  businessCriticalImpacted: string[];
  explanation: string;
  policy: PolicyRef;
}

export interface ReleaseHealth {
  total: number;
  passed: number;
  failed: number;
  broken: number;
  skipped: number;
  executed: number;
  passRate: number;
}

export interface CategoryCounts {
  knownOpenDefects: number;
  newWithJira: number;
  newWithoutJira: number;
  potentialGenuineDefects: number;
  automationOrFlaky: number;
  environment: number;
  testData: number;
  inconclusive: number;
}

export interface ValidationSummary {
  selected: number;
  notEligible: number;
  reproduced: number;
  intermittent: number;
  notReproduced: number;
  differentFailure: number;
  inconclusive: number;
  totalAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  erroredAttempts: number;
}

export interface DefectSummary {
  issue: JiraIssue;
  linkedTestCases: string[];
  failureIds: string[];
  category: FailureCategory;
  waiver: Waiver | null;
  releaseImpact: ReleaseImpact;
}

export type IntegrationState = 'OK' | 'DEGRADED' | 'UNAVAILABLE';

export interface IntegrationStatus {
  name: string;
  adapter: string;
  status: IntegrationState;
  message: string | null;
}

export interface AuditInfo {
  model: ModelInfo;
  policy: PolicyRef;
  platformVersion: string;
  analysisStartedAt: string;
  analysisCompletedAt: string;
  durationMs: number;
}

export interface Assessment {
  id: string;
  createdAt: string;
  execution: ExecutionSummary;
  health: ReleaseHealth;
  failures: FailureRecord[];
  categoryCounts: CategoryCounts;
  validationSummary: ValidationSummary;
  defects: DefectSummary[];
  decision: ReleaseDecision;
  integrations: IntegrationStatus[];
  audit: AuditInfo;
}

export interface AssessmentListItem {
  id: string;
  executionId: string;
  release: string;
  build: string;
  environment: string;
  createdAt: string;
  decision: Decision;
  riskScore: number;
  passRate: number;
  policyVersion: string;
}
