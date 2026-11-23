# File: `server/src/pipeline/revalidation.ts`

**What it is:** Decides what the browser re-runs *mean*. After the configured
attempts it labels the result:

- **REPRODUCED** — failed again → strong evidence it's a real problem
- **NOT_REPRODUCED** — passed cleanly → flaky/timing leaning
- **INTERMITTENT** — mixed results → flaky
- **DIFFERENT_FAILURE** — failed, but a *different* error
- **INCONCLUSIVE** — couldn't run (browser error, unparseable steps)

`sameUnmetExpectation` spots that two differently-worded errors are really
the same failed assertion. It also marks tests as NOT_ELIGIBLE (no re-run
approval) or NOT_REQUIRED.

**Why it exists:** A re-run is evidence, not a verdict — this file translates
it into a careful verdict category.
