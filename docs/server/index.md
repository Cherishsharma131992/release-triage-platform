# File: `server/src/index.ts`

**What it is:** The front door of the server process. It bootstraps the
system, starts the API on port 4000, prints which adapters and AI brain are
active, runs the watcher once immediately, then starts its timer.

**Why it exists:** `npm start` → this file runs → the platform is alive.
