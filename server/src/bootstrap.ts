import { createMockAdapters } from './adapters/mock';
import type { Adapters } from './adapters/types';
import { createAIProvider, type AIProvider } from './ai';
import { AssessmentService } from './pipeline/assessmentService';
import { loadPolicy, type ReleasePolicy } from './policy/policy';
import { seedDemoData } from './store/seed';
import { Store } from './store/store';

export interface BootstrapOptions {
  dbPath: string;
  policyPath: string;
  adapterMode?: string;
  mockUnavailable?: string[];
  seedDemoData?: boolean;
  ai?: AIProvider;
}

export function bootstrap(opts: BootstrapOptions) {
  const store = new Store(opts.dbPath);
  if (opts.adapterMode && opts.adapterMode !== 'mock') {
    throw new Error(`ADAPTER_MODE=${opts.adapterMode} is not implemented yet; only "mock" is available.`);
  }
  const adapters: Adapters = createMockAdapters(store, opts.mockUnavailable ?? []);
  if (opts.seedDemoData ?? true) seedDemoData(store);
  // Re-read on every assessment so policy edits apply without a restart.
  const policy = (): ReleasePolicy => loadPolicy(opts.policyPath);
  policy();
  const ai = opts.ai ?? createAIProvider();
  const service = new AssessmentService({ adapters, ai, policy, store });
  return { store, adapters, policy, ai, service };
}
