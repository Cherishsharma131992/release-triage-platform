# File: `server/src/integrations/allure/allureResults.ts`

**What it is:** Reads a real **Allure results folder** — the `*-result.json`
files Playwright/pytest/etc. produce — and turns them into the platform's
Execution shape. It also reads `environment.properties` and `executor.json`
for context, collapses retries of the same test (via `historyId`) into one
result, and imports attachments (screenshots, logs, even binary files) into
the database so the dashboard can show them.

**Why it exists:** This is the bridge from "whatever your test framework
wrote to disk" to "a tidy list of failures the platform understands".

**Env vars:** `ALLURE_RESULTS_DIR`.
