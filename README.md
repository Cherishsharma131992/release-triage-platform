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
| `ADAPTER_MODE` | `mock` | Only `mock` is implemented today |
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

## Going live
Implement the interfaces in `server/src/adapters/types.ts` for Allure TestOps / report files, Zephyr Scale, Jira Cloud and a Playwright MCP server, then wire them in `server/src/bootstrap.ts`.
