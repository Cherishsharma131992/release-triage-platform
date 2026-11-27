# File: `server/src/integrations/playwright-mcp/stepPlan.ts`

**What it is:** A translator from **human-written test steps** to concrete
browser commands. It understands a fixed grammar like:

- `Navigate to /login`
- `Click button "Sign in"`
- `Enter "qa@shop.io" into "Email"`
- `Verify text "Welcome back" is visible`

**Important:** if a step is written as free text it can't parse, it refuses
and marks the re-run inconclusive — it never guesses. Guessing would make
the evidence untrustworthy.

**Why it exists:** Zephyr steps are written for humans; the browser needs
exact instructions. This is the safe bridge between them.
