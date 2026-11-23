# File: `server/src/store/store.ts`

**What it is:** The database layer (SQLite via better-sqlite3). It stores
executions, failure records, history, assessments, waivers, and file
artifacts (with base64 support for binary screenshots). It migrates its own
schema when needed.

**Why it exists:** History matching, audit trails and the dashboard all need
somewhere durable to read from — this is it. Swap-in a real DB later without
changing callers' intent.
