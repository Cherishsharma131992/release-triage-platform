# File: `demo/run-live-demo.mjs`

**What it is:** The one-command demo conductor. `npm run demo:live` runs this
script, which:

1. starts the demo shop on port 4100 with injected bugs (`BUGS=vat,search`),
2. runs the real Playwright suite → writes real Allure results,
3. starts the platform on port 4000 wired to: live Allure reading those
   results, file-based Zephyr/Jira (overridable via `TCM_ADAPTER` /
   `DEFECTS_ADAPTER` env vars for real accounts), live Playwright re-runs,
4. leaves everything running so you can open the dashboard.

Handles headed mode (`HEADED=1`), slow-motion, Windows (`npx.cmd` via shell),
and cleans up child processes on Ctrl+C.

**Why it exists:** A complete, account-free demonstration of the real
pipeline in ~3 minutes.
