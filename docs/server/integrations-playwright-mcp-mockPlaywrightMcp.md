# File: `server/src/integrations/playwright-mcp/mockPlaywrightMcp.ts`

**What it is:** Pretends to re-run tests in a browser. Instead of launching
Chrome it looks up each test case's *scripted* re-run outcome (reproduced /
passed / inconclusive) defined in the mock data, so every category of
revalidation result can be exercised deterministically.

**Why it exists:** Real browser re-runs are slow; the mock gives instant,
predictable answers for tests and demos.
