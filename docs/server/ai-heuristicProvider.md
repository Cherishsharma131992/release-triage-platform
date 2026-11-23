# File: `server/src/ai/heuristicProvider.ts`

**What it is:** The default brain — no API key, no internet needed. It's a
carefully ordered set of explainable rules, e.g.:

- a Jira defect already matches → known defect
- error mentions timeouts/loading → timing issue
- 500s/connection refused → environment problem
- "no such test data" → missing test data
- reproduced on every re-run → escalate toward a real application defect
- same failure seen across many past builds → recurring/flaky pattern

Every answer comes back with confidence, the rules that fired ("signals"),
and a recommended action — so it's auditable, not a black box.

**Why it exists:** Devin has no app-callable LLM, so this is the guaranteed
baseline brain; the optional LLM only refines it.
