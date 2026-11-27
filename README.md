# AI-Powered Automation Failure Triage & Release Decision Platform

Single-page platform that turns an automation run into an evidence-backed **GO / NO-GO / HOLD** release recommendation for executives, without QA having to analyse each failure by hand.

```
Allure results ─► collect + fingerprint ─► history match ─► Jira Cloud correlation
     │                                                          │
Zephyr test cases ─────────────────────────────► AI classification (explainable)
                                                                │
                              Playwright MCP re-validation (approved tests, N attempts)
                                                                │
                   Deterministic YAML release policy (+ waivers) ─► GO / NO-GO / HOLD
                                                                │
                                         Executive dashboard with drill-down evidence
```

## Quick start

```bash
nvm use            # Node 22
npm install
npm run build && npm start      # http://localhost:4000 (API + dashboard)
# or, for development with hot reload:
npm run dev                     # API :4000, dashboard :5173
npm test                        # server unit + integration tests
```

On start the platform seeds demo history/waivers and assesses three mock executions:

| Execution | Recommendation | Why |
|---|---|---|
| `2.14.0-rc.3` | NO-GO | Reproduced payment 500 on a business-critical flow, open critical VAT defect |
| `2.14.0-rc.4` | HOLD | Known promo defect without waiver, intermittent failure still needs validation |
| `2.14.0-rc.5` | GO | Only automation/environment noise; waived known defect |

## Live demo (no external accounts needed)

```bash
npx playwright install chromium   # once, or set DEMO_CHROME_PATH to an existing Chrome
npm run demo:live                 # dashboard: http://localhost:4000
```

This command runs a real pipeline end to end. Only Zephyr and Jira are replaced by JSON exports in `demo/integrations`, because they need accounts:

1. Starts the **demo shop** (`demo/application`) with injected bugs (`BUGS=vat,search`).
2. Runs a **real Playwright suite** (`demo/automation-scripts`, 14 tests). The `allure-playwright` reporter writes real Allure results with real screenshots to `demo/allure-reports/live/<run>`.
3. Starts the platform with live Allure (`RESULTS_ADAPTER=live`) and **real Playwright MCP re-runs** (`REVALIDATION_ADAPTER=live`) against the shop. Zephyr test cases and Jira issues come from `demo/integrations/zephyr/zephyr-testcases.json` and `demo/integrations/jira/jira-issues.json` (`TCM_ADAPTER=file`, `DEFECTS_ADAPTER=file`).

| Test | Failure cause in the demo | Expected triage |
|---|---|---|
| DEMO-T6 German VAT | Real app bug (`vat`) | Reproduced by MCP → application defect, business-critical → NO-GO |
| DEMO-T4 Search | Real app bug (`search`), open Jira DEMO-101 | Matched to the existing Jira issue |
| DEMO-T9 Recommendations | Test waits too briefly | MCP re-run passes → timing/sync |
| DEMO-T10 Price labels | Bug in the test script (`TypeError`) | MCP re-run passes → automation script |
| DEMO-T11 Inventory health | Service not running (`ECONNREFUSED`) | Environment |
| DEMO-T12 Loyalty login | Seed user missing | Test data |

Add `HEADED=1` to watch Chrome run the suite and the Playwright MCP re-runs, slowed down (`SLOW_MO`, `PLAYWRIGHT_MCP_STEP_DELAY_MS`). Run it again to add another execution; history then marks repeats as recurring. Use `BUGS=` (empty) for a clean build.

## Project structure

```
server/                         Triage platform API (the application)
  src/integrations/             One folder per external tool
    jira/                       Jira Cloud REST + JSON-export adapters
    zephyr/                     Zephyr Scale REST, JSON-export and mock adapters
    allure/                     Allure results reader + mock
    playwright-mcp/             Playwright MCP re-validation, step grammar, mock
    shared/  mock-data/         HTTP/JSON helpers, mock fixtures
    index.ts  mock.ts  types.ts Adapter selection, mock factory, contracts
  src/pipeline  ai  policy  store  domain
web/                            Executive dashboard (React + Vite)
demo/                           Test automation framework for the live demo
  application/                  Demo shop under test (injectable bugs)
  automation-scripts/           Playwright specs
  integrations/jira/            Jira issues export
  integrations/zephyr/          Zephyr test cases export + Allure TMS link helper
  allure-reports/               Allure results per run (git-ignored)
  playwright.config.ts  run-live-demo.mjs
```

## Architecture

| Area | Location |
|---|---|
| Domain model | `server/src/domain/types.ts` |
| Integration adapters (contracts, live, file and mock) | `server/src/integrations` |
| Fingerprinting, history, Jira correlation, re-validation | `server/src/pipeline` |
| AI providers (built-in heuristic, OpenAI/Anthropic) | `server/src/ai` |
| Release policy (YAML + engine) | `server/config/release-policy.yaml`, `server/src/policy` |
| SQLite store (history, assessments, waivers, artifacts) | `server/src/store` |
| REST API | `server/src/app.ts` |
| Dashboard (React + Vite) | `web/src` |

### Key principles
- **The LLM never decides.** AI classifies and explains; the release decision comes only from the versioned YAML policy. Every assessment records the policy version and hash and the AI model/version.
- **Open defects are not auto-accepted.** A known open Jira defect blocks or holds the release until a business waiver (approver, role, justification, expiry) is recorded.
- **A green re-run is not proof.** `NOT_REPRODUCED` only lowers confidence; the original failure stays visible, and functional failures on business-critical flows still need human confirmation.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | HTTP port |
| `DB_PATH` | `server/data/triage.db` | SQLite file |
| `POLICY_PATH` | `server/config/release-policy.yaml` | Release policy |
| `ADAPTER_MODE` | `mock` | `mock` or `live`; per-integration overrides below |
| `SEED_DEMO_DATA` | `true` with mock results | Seed demo history/waivers |
| `MOCK_UNAVAILABLE` | – | Simulate outages, e.g. `jira,playwright` |
| `POLL_INTERVAL_MS` | `60000` | How often to look for completed executions |
| `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` | – | Optional `openai` or `anthropic` provider; falls back to the built-in heuristic on error |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/executions` | Allure executions and whether they are assessed |
| GET | `/api/assessments` · `/api/assessments/latest` · `/api/assessments/:id` | Assessments |
| POST | `/api/assessments` `{executionId}` | Run / re-run an assessment |
| POST | `/api/webhooks/execution-completed` `{executionId}` | CI hook when a run completes |
| GET / POST | `/api/waivers` | List / record business waivers |
| GET | `/api/policy` | Active release policy |
| GET | `/api/artifacts/:id` | Screenshots, logs, traces |

## Live integrations

Each integration can be switched independently (`mock` | `live`), so you can connect Jira first and keep the rest mocked. Copy `.env.example` to `.env` (git-ignored); the server and `npm run demo:live` load it on start, and variables already set in the shell win (`ENV_FILE` points to another file).

Example: live Jira, everything else unchanged (also applies to `npm run demo:live`):
```
DEFECTS_ADAPTER=live
JIRA_BASE_URL=https://yourco.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=<Atlassian API token>
JIRA_PROJECT_KEYS=SCRUM
```
The startup log then shows `defects=jira-cloud`.

Importing the demo test cases into your Zephyr Scale project (one-time, safe to re-run: cases whose name already exists are skipped):
```
ZEPHYR_API_TOKEN=<Zephyr Scale API access token: Jira → your avatar → Zephyr API keys>
ZEPHYR_PROJECT_KEY=SCRUM          # defaults to the first JIRA_PROJECT_KEYS entry
npm run zephyr:import -- --dry-run   # shows what would be created
npm run zephyr:import                # creates the 14 cases (with steps) in folder "Failure Triage Demo"
```
Component, business-critical and revalidation flags are stored as labels and the script path as an `Automation script:` line in the objective, so no Zephyr custom fields are needed. The import writes `demo/integrations/zephyr/zephyr-key-map.json` (local key → Zephyr key, e.g. `DEMO-T1` → `SCRUM-T1`); with `TCM_ADAPTER=live` the Playwright specs report the Zephyr keys, so the platform reads the cases from Zephyr. Jira bugs should reference the Zephyr keys (e.g. label `SCRUM-T4`) to be linked directly.

| Integration | Switch | Live settings |
|---|---|---|
| Allure results (CI `allure-results` dirs) | `RESULTS_ADAPTER` | `ALLURE_RESULTS_DIR`: one sub-directory per execution. Release/environment from `environment.properties` (`RELEASE`, `ENVIRONMENT`), build/CI link from `executor.json`. Retries collapse to the last attempt. |
| Zephyr Scale Cloud (API v2) | `TCM_ADAPTER` | `ZEPHYR_API_TOKEN`, optional `ZEPHYR_BASE_URL` (EU: `https://eu.api.zephyrscale.smartbear.com/v2`), `ZEPHYR_PROJECT_KEY` for the import. Custom fields/labels: `Automation Script`, `Business Critical` / `business-critical`, `Playwright Revalidation` / `playwright-revalidation`, `Component`. |
| Jira Cloud (REST v3) | `DEFECTS_ADAPTER` | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEYS`, optional `JIRA_SEVERITY_FIELD` (e.g. `customfield_10050`, otherwise severity is derived from priority) and `JIRA_BUG_ISSUE_TYPES`. Test case keys in labels/summary become direct links. |
| Playwright MCP | `REVALIDATION_ADAPTER` | `PLAYWRIGHT_BASE_URL` (app under test). `PLAYWRIGHT_MCP_URL` for a running server (Streamable HTTP); otherwise `@playwright/mcp` is spawned headless per attempt (`PLAYWRIGHT_MCP_EXECUTABLE_PATH` to pick a browser). |

### Re-validation step format
Only Zephyr test cases approved for re-validation are re-run, and their steps must use this grammar. A step outside it makes the attempt **inconclusive**; the platform never guesses.

```
Navigate to /login                      Click button "Sign in"      Click {getByTestId("checkout")}
Enter "qa@shop.io" into "Email"         Fill "Password" with "x"    Select "EUR" from "Currency"
Press Enter                             Wait 2 seconds              Verify text "Welcome back" is visible
```
Every quoted string in a step's *expected result* is asserted as visible text. The real-browser test runs with `PLAYWRIGHT_MCP_E2E=1 npm test -w server`.
