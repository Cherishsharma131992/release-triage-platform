# File: `server/src/ai/provider.ts`

**What it is:** The contract every AI provider must follow. Given a
`FailureAnalysisInput` (everything we know about a failure), it must return
an `AIClassification`: the category, a confidence score, reasoning, the
signals it used, and a recommended action. It also defines inputs for
assessing re-run results and writing the human-readable decision summary.

**Why it exists:** So the pipeline can swap between the built-in rule-based
"AI" and a real LLM without changing anything else.
