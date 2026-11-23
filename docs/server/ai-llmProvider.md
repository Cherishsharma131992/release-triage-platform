# File: `server/src/ai/llmProvider.ts`

**What it is:** The optional **real LLM** provider (OpenAI or Anthropic). It
first asks the heuristic provider for a baseline answer, then sends the
evidence plus that baseline to the LLM for refinement. If the LLM call fails
or returns garbage, it silently falls back to the heuristic answer.

**Why it exists:** Better reasoning when a key is configured, but the
platform still works (and never crashes) without one. The LLM can advise
and explain — the policy engine, not the LLM, still makes the final call.
