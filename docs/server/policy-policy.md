# File: `server/src/policy/policy.ts`

**What it is:** Loads `release-policy.yaml` into typed objects the engine
uses, and computes a **hash** of the policy so every stored decision records
exactly which rulebook version produced it.

**Why it exists:** Decisions must be reproducible and auditable — "which
rules were in force then?" is always answerable. It's re-read per
assessment, so edits apply without a restart.
