# File: `server/package.json`

**What it is:** The server's own settings: its name, its npm dependencies
(Express for the API, better-sqlite3 for the database, zod for input
checking, the Playwright MCP client, vitest for tests) and its scripts
(`dev`, `build`, `start`, `test`, `typecheck`).

**Why it exists:** Each part of the workspace manages its own dependencies.
