# File: `server/src/adapters/mock/artifacts.ts`

**What it is:** Generates the fake **attachments** (small screenshots, log
snippets) attached to mock failures so the dashboard's evidence panel has
something real-looking to display.

**Why it exists:** A drill-down with no evidence would demo poorly; this
fills the gap without real test output.
