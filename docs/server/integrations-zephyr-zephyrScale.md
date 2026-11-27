# File: `server/src/integrations/zephyr/zephyrScale.ts`

**What it is:** Talks to the real **Zephyr Scale Cloud API (v2)**. Given test
keys like `DEMO-T4`, it fetches each test case's name, objective, steps,
priority, labels, component and custom fields (business-critical flag,
automation script path, "approved for browser re-run" flag).

**Why it exists:** The platform needs to know what a failing test *meant* —
which requirement it checks, whether it's critical, and whether it's allowed
to be re-run automatically. Zephyr holds those answers.

**Env vars:** `ZEPHYR_API_TOKEN`, region, and optional custom-field names.
