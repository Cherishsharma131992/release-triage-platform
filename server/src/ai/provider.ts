import type {
  AIClassification,
  CategoryCounts,
  ExecutionSummary,
  FailureCategory,
  HistoryAnalysis,
  JiraMatch,
  ModelInfo,
  ReleaseDecision,
  ReleaseHealth,
  TestCase,
  ValidationResult,
} from '../domain/types';

export interface FailureAnalysisInput {
  testName: string;
  testCaseKey: string | null;
  component: string;
  businessCritical: boolean;
  errorMessage: string | null;
  stackTrace: string | null;
  scriptPath: string | null;
  testCase: TestCase | null;
  history: HistoryAnalysis;
  jira: JiraMatch | null;
  category: FailureCategory;
}

export interface ValidationAssessmentInput {
  failure: FailureAnalysisInput;
  initial: AIClassification;
  validation: ValidationResult;
}

export interface DecisionExplanationInput {
  execution: ExecutionSummary;
  health: ReleaseHealth;
  categoryCounts: CategoryCounts;
  decision: Omit<ReleaseDecision, 'explanation'>;
}

/**
 * AI analysis provider. Providers classify and explain; they never decide the release outcome,
 * which is produced by the deterministic policy engine.
 */
export interface AIProvider {
  readonly info: ModelInfo;
  classifyFailure(input: FailureAnalysisInput): Promise<AIClassification>;
  assessValidation(input: ValidationAssessmentInput): Promise<AIClassification>;
  explainDecision(input: DecisionExplanationInput): Promise<string>;
}
