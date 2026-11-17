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

## Architecture

| Area | Location |
|---|---|
| Domain model | `server/src/domain/types.ts` |
| Integration adapters (interfaces + mocks) | `server/src/adapters` |
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

Each integration can be switched independently (`mock` | `live`), so you can connect Jira first and keep the rest mocked. See `.env.example`.

| Integration | Switch | Live settings |
|---|---|---|
| Allure results (CI `allure-results` dirs) | `RESULTS_ADAPTER` | `ALLURE_RESULTS_DIR`: one sub-directory per execution. Release/environment from `environment.properties` (`RELEASE`, `ENVIRONMENT`), build/CI link from `executor.json`. Retries collapse to the last attempt. |
| Zephyr Scale Cloud (API v2) | `TCM_ADAPTER` | `ZEPHYR_API_TOKEN`, optional `ZEPHYR_BASE_URL` (EU: `https://eu.api.zephyrscale.smartbear.com/v2`). Custom fields/labels: `Automation Script`, `Business Critical` / `business-critical`, `Playwright Revalidation` / `playwright-revalidation`, `Component`. |
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
