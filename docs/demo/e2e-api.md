# File: `demo/e2e/api.spec.ts`

**What it is:** Tests hitting the shop's backend endpoints directly —
inventory health (deliberately fails: service down → ENVIRONMENT),
and loyalty-login data (deliberately fails: missing test data → TEST_DATA).

**Why it exists:** Produces the environment and test-data failure categories
in the demo.
