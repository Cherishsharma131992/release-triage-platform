# File: `server/src/policy/engine.ts`

**What it is:** The judge. It evaluates every rule in the release policy
against the finished assessment: pass rate, business-critical failures,
unresolved critical defects, unknown/unclassified failures, missing waivers,
integration health, etc. Each check produces pass/fail + evidence, the
results roll up into a **risk score**, and the outcome is **GO / NO_GO /
HOLD**.

**Crucially:** no AI output overrides this. The AI advises; the rulebook
decides. Every criterion links to the evidence it used so the decision is
explainable and auditable.
