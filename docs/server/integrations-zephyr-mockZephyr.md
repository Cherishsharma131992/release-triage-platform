# File: `server/src/integrations/zephyr/mockZephyr.ts`

**What it is:** Pretends to be Zephyr. Returns the canned test cases from
`../mock-data/testCases.ts` when asked.

**Why it exists:** Same role as the real Zephyr adapter, but with zero
network and zero accounts.
