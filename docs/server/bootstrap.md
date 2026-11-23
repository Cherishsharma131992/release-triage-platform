# File: `server/src/bootstrap.ts`

**What it is:** The wiring room. In a few lines it creates the store, builds
the four adapters from the environment, seeds demo data if appropriate,
loads the release policy (re-read every assessment), picks the AI provider,
and constructs the AssessmentService that ties them all together.

**Why it exists:** Keeps `index.ts` clean and lets tests build the same
system with different options.
