# File: `server/src/adapters/live/playwrightMcp.ts`

**What it is:** The re-run engine. It drives a **real web browser** through
the Playwright MCP tool — either a running MCP server (`PLAYWRIGHT_MCP_URL`)
or one it launches itself. Given a test case, it replays the steps (navigate,
click, fill, verify) up to N attempts and reports each attempt's outcome.

It handles headed/headless mode, a visible step delay (so you can watch it),
custom browser executables, and treats "browser can't even start" as an
error — not as a test failure.

**Why it exists:** Re-running a failure in a clean browser is the strongest
cheap evidence about whether it reproduces.
