# File: `server/src/app.ts`

**What it is:** The **HTTP API** — every URL the dashboard (or CI) calls:

- `GET /api/health`, `/api/executions`, `/api/assessments`,
  `/api/assessments/latest`, `/api/assessments/:id`
- `GET /api/failures/:id` (the drill-down detail)
- `GET /api/artifacts/:id` (screenshots/logs)
- `POST /api/waivers` (record a business waiver)
- `POST /api/webhooks/execution-completed` (CI pushes a finished run)
- serves the built dashboard files too

It validates request bodies (e.g. a waiver needs approver, role, ≥10-char
justification, valid expiry) and returns clear validation errors.

**Why it exists:** The single front door between the UI/outside world and
the pipeline + store.
