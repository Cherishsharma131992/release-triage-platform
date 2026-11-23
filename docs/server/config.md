# File: `server/src/config.ts`

**What it is:** Reads environment variables once and exposes them with
sensible defaults: port 4000, DB path, policy file path, dashboard build
folder, the mock-unavailable list, the watcher poll interval, and whether to
seed demo data.

**Why it exists:** One place where "settings" live instead of env-var reads
scattered across the code.
