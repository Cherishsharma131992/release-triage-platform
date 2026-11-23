# File: `server/src/ai/index.ts`

**What it is:** The AI chooser. If `LLM_PROVIDER` is `openai` or `anthropic`
*and* an `LLM_API_KEY` is set, it builds the real LLM provider. Otherwise it
builds the built-in heuristic provider.

**Why it exists:** One place deciding which "brain" the platform uses —
defaults to the always-available heuristic, upgrades to an LLM only when
credentials exist.
