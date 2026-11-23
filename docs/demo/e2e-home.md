# File: `demo/e2e/home.spec.ts`

**What it is:** Home-page tests, including the recommendations widget whose
2–4 s load exceeds the test's 800 ms timeout (DEMO-T9 → passes on re-run →
TIMING) and other passing checks.

**Why it exists:** Produces the flaky/timing category.
