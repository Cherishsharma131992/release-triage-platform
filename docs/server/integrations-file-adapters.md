# Files: `server/src/integrations/zephyr/fileZephyr.ts`, `server/src/integrations/jira/fileJira.ts`, `server/src/integrations/shared/jsonFile.ts`

**What it is:** Two simple adapters that read **JSON export files** instead
of real systems:

- `FileTestCaseAdapter` (`zephyr/fileZephyr.ts`) — test cases from `demo/integrations/zephyr/zephyr-testcases.json`
- `FileDefectAdapter` (`jira/fileJira.ts`) — Jira-style issues from `demo/integrations/jira/jira-issues.json`

Both share the JSON helpers in `shared/jsonFile.ts` and re-read the file on every call, so editing the JSON is instantly
reflected.

**Why it exists:** Lets the whole real pipeline run end-to-end with zero
accounts — which is how the demo works on machines with no Zephyr/Jira.
