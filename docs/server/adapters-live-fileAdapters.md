# File: `server/src/adapters/live/fileAdapters.ts`

**What it is:** Two simple adapters that read **JSON export files** instead
of real systems:

- `FileTestCaseAdapter` — test cases from `demo/data/zephyr-testcases.json`
- `FileDefectAdapter` — Jira-style issues from `demo/data/jira-issues.json`

Both re-read the file on every call, so editing the JSON is instantly
reflected.

**Why it exists:** Lets the whole real pipeline run end-to-end with zero
accounts — which is how the demo works on machines with no Zephyr/Jira.
