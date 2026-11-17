import type { ArtifactSink } from '../../store/store';
import { createMockAdapters } from '../mock';
import type { Adapters } from '../types';
import { AllureResultsDirAdapter } from './allureResults';
import { JiraCloudAdapter, jiraConfigFromEnv } from './jiraCloud';
import { PlaywrightMcpAdapter, playwrightMcpConfigFromEnv } from './playwrightMcp';
import { ZephyrScaleAdapter, zephyrConfigFromEnv } from './zephyrScale';
import { requireEnv } from './http';

export type AdapterSelection = Record<keyof Adapters, 'mock' | 'live'>;

/** ADAPTER_MODE=mock|live sets the default; RESULTS_/TCM_/DEFECTS_/REVALIDATION_ADAPTER override per integration. */
export function adapterSelection(env: NodeJS.ProcessEnv): AdapterSelection {
  const base = env.ADAPTER_MODE === 'live' ? 'live' : 'mock';
  const sel = (name: string): 'mock' | 'live' => {
    const v = (env[name] ?? base).toLowerCase();
    if (v !== 'mock' && v !== 'live') throw new Error(`${name} must be "mock" or "live" (got "${v}")`);
    return v;
  };
  if (env.ADAPTER_MODE && !['mock', 'live'].includes(env.ADAPTER_MODE)) throw new Error(`ADAPTER_MODE must be "mock" or "live"`);
  return {
    results: sel('RESULTS_ADAPTER'),
    testCases: sel('TCM_ADAPTER'),
    defects: sel('DEFECTS_ADAPTER'),
    revalidation: sel('REVALIDATION_ADAPTER'),
  };
}

export function createAdapters(env: NodeJS.ProcessEnv, artifacts: ArtifactSink, mockUnavailable: string[] = []): Adapters {
  const s = adapterSelection(env);
  const mock = createMockAdapters(artifacts, mockUnavailable);
  return {
    results: s.results === 'live' ? new AllureResultsDirAdapter(requireEnv(env, 'ALLURE_RESULTS_DIR'), artifacts) : mock.results,
    testCases: s.testCases === 'live' ? new ZephyrScaleAdapter(zephyrConfigFromEnv(env)) : mock.testCases,
    defects: s.defects === 'live' ? new JiraCloudAdapter(jiraConfigFromEnv(env)) : mock.defects,
    revalidation: s.revalidation === 'live' ? new PlaywrightMcpAdapter(playwrightMcpConfigFromEnv(env), artifacts) : mock.revalidation,
  };
}
