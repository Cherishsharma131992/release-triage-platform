# File: `server/src/pipeline/history.ts`

**What it is:** Answers "what does the past say about this failure?" Using
fingerprints it reports: first/last seen, how many builds and releases it
appeared in, how often the same test failed, and whether it looks like a
**new**, **known** or **flaky/recurring** failure.

**Why it exists:** A failure seen in 8 of the last 10 builds means something
very different from one never seen before — this file quantifies that.
