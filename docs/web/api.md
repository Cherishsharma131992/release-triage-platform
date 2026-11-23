# File: `web/src/api.ts`

**What it is:** The dashboard's phone line to the server — one typed
function per API endpoint (`fetchLatest`, `fetchAssessment`, `fetchFailure`,
`createWaiver`, …). It turns JSON into the TypeScript shapes the components
expect.

**Why it exists:** Keeps all network details in one file; components just
call functions.
