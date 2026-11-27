import type { ArtifactSink } from '../store/store';
import { createMockAdapters } from './mock';
import type { Adapters } from './types';
import { AllureResultsDirAdapter } from './allure/allureResults';
import { FileDefectAdapter } from './jira/fileJira';
import { FileTestCaseAdapter } from './zephyr/fileZephyr';
import { JiraCloudAdapter, jiraConfigFromEnv } from './jira/jiraCloud';
import { PlaywrightMcpAdapter, playwrightMcpConfigFromEnv } from './playwright-mcp/playwrightMcp';
import { ZephyrScaleAdapter, zephyrConfigFromEnv } from './zephyr/zephyrScale';
import { requireEnv } from './shared/http';

export type AdapterMode = 'mock' | 'live' | 'file';
export type AdapterSelection = Record<keyof Adapters, AdapterMode>;

/**
 * ADAPTER_MODE=mock|live sets the default; RESULTS_/TCM_/DEFECTS_/REVALIDATION_ADAPTER override per integration.
 * TCM_ADAPTER and DEFECTS_ADAPTER also accept `file` (JSON exports via ZEPHYR_TESTCASES_FILE / JIRA_ISSUES_FILE).
 */
export function adapterSelection(env: NodeJS.ProcessEnv): AdapterSelection {
  const base = env.ADAPTER_MODE === 'live' ? 'live' : 'mock';
  const sel = (name: string, allowFile = false): AdapterMode => {
    const v = (env[name] ?? base).toLowerCase();
    const allowed = allowFile ? ['mock', 'live', 'file'] : ['mock', 'live'];
    if (!allowed.includes(v)) throw new Error(`${name} must be one of ${allowed.join(', ')} (got "${v}")`);
    return v as AdapterMode;
  };
  if (env.ADAPTER_MODE && !['mock', 'live'].includes(env.ADAPTER_MODE)) throw new Error(`ADAPTER_MODE must be "mock" or "live"`);
  return {
    results: sel('RESULTS_ADAPTER'),
    testCases: sel('TCM_ADAPTER', true),
    defects: sel('DEFECTS_ADAPTER', true),
    revalidation: sel('REVALIDATION_ADAPTER'),
  };
}

export function createAdapters(env: NodeJS.ProcessEnv, artifacts: ArtifactSink, mockUnavailable: string[] = []): Adapters {
  const s = adapterSelection(env);
  const mock = createMockAdapters(artifacts, mockUnavailable);
  return {
    results: s.results === 'live' ? new AllureResultsDirAdapter(requireEnv(env, 'ALLURE_RESULTS_DIR'), artifacts) : mock.results,
    testCases:
      s.testCases === 'live'
        ? new ZephyrScaleAdapter(zephyrConfigFromEnv(env))
        : s.testCases === 'file'
          ? new FileTestCaseAdapter(requireEnv(env, 'ZEPHYR_TESTCASES_FILE'))
          : mock.testCases,
    defects:
      s.defects === 'live'
        ? new JiraCloudAdapter(jiraConfigFromEnv(env))
        : s.defects === 'file'
          ? new FileDefectAdapter(requireEnv(env, 'JIRA_ISSUES_FILE'))
          : mock.defects,
    revalidation: s.revalidation === 'live' ? new PlaywrightMcpAdapter(playwrightMcpConfigFromEnv(env), artifacts) : mock.revalidation,
  };
}
