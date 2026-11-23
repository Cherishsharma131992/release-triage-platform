# File: `demo/playwright.config.ts`

**What it is:** Playwright's settings for the demo suite: where tests live,
which browser, the Allure reporter (writes the files the platform reads),
one worker in headed mode, and `HEADED`/`SLOW_MO` env options so you can
watch the browser work.

**Why it exists:** Standard Playwright configuration wired to produce Allure
output.
