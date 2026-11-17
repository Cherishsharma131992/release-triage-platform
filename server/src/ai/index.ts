import { HeuristicProvider } from './heuristicProvider';
import { LlmProvider } from './llmProvider';
import type { AIProvider } from './provider';

export function createAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  const provider = (env.LLM_PROVIDER ?? 'heuristic').toLowerCase();
  if ((provider === 'openai' || provider === 'anthropic') && env.LLM_API_KEY) {
    return new LlmProvider({
      provider,
      apiKey: env.LLM_API_KEY,
      model: env.LLM_MODEL ?? (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-latest'),
      baseUrl: env.LLM_BASE_URL,
    });
  }
  return new HeuristicProvider();
}

export type { AIProvider } from './provider';
