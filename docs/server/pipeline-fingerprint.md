# File: `server/src/pipeline/fingerprint.ts`

**What it is:** Turns an error message + stack trace into a stable
**fingerprint**: it strips run-specific noise (timestamps, ports, IDs,
paths), keeps the meaningful words, and hashes the result. Two runs of "the
same bug" produce the same fingerprint even if the text differs slightly.

**Why it exists:** "Have we seen this exact failure before?" can't be
answered by raw string comparison — the fingerprint is the answer.
