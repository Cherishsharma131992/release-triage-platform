# File: `server/src/integrations/index.ts`

**What it is:** The **adapter chooser**. At startup it reads the environment
variables (`ADAPTER_MODE`, `RESULTS_ADAPTER`, `TCM_ADAPTER`, `DEFECTS_ADAPTER`,
`REVALIDATION_ADAPTER`) and builds the four adapters:

- `mock` → the pretend adapters (demo/test data baked in)
- `live` → real Allure folder, real Zephyr, real Jira, real Playwright
- `file` → JSON export files standing in for Zephyr/Jira

Each of the four can be chosen independently — e.g. live Jira with
file-based Zephyr, which is exactly what we used for your account.

**Why it exists:** One place that turns configuration into working plumbing.
