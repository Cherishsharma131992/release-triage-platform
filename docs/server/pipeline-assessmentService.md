# File: `server/src/pipeline/assessmentService.ts`

**What it is:** The **conductor**. `assess(executionId)` runs the whole
triage for one test run, in order:

1. health-checks every adapter (shown on the dashboard as OK/UNAVAILABLE),
2. loads the execution and its failures,
3. fetches Zephyr test cases, fingerprints each failure, analyses history,
4. correlates with Jira, asks the AI to classify,
5. re-runs eligible failures,
6. re-asks the AI with the re-run evidence (classification can change),
7. runs the policy engine for the decision + risk score,
8. writes everything to the store and returns the full Assessment.

**Why it exists:** One well-known sequence; every other pipeline file is a
single step in it.
