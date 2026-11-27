import { adapterSelection, createAdapters } from './integrations';
import type { Adapters } from './integrations/types';
import { createAIProvider, type AIProvider } from './ai';
import { AssessmentService } from './pipeline/assessmentService';
import { loadPolicy, type ReleasePolicy } from './policy/policy';
import { seedDemoData } from './store/seed';
import { Store } from './store/store';

export interface BootstrapOptions {
  dbPath: string;
  policyPath: string;
  /** Adapter selection and live-integration settings (defaults to process.env). */
  env?: NodeJS.ProcessEnv;
  mockUnavailable?: string[];
  seedDemoData?: boolean;
  ai?: AIProvider;
}

export function bootstrap(opts: BootstrapOptions) {
  const store = new Store(opts.dbPath);
  const env = opts.env ?? process.env;
  const adapters: Adapters = createAdapters(env, store, opts.mockUnavailable ?? []);
  const selection = adapterSelection(env);
  if (opts.seedDemoData ?? selection.results === 'mock') seedDemoData(store);
  // Re-read on every assessment so policy edits apply without a restart.
  const policy = (): ReleasePolicy => loadPolicy(opts.policyPath);
  policy();
  const ai = opts.ai ?? createAIProvider();
  const service = new AssessmentService({ adapters, ai, policy, store });
  return { store, adapters, selection, policy, ai, service };
}
