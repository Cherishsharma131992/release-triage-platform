# File: `server/src/integrations/allure/mockAllure.ts`

**What it is:** Pretends to be an Allure report source. Returns three canned
executions (rc.3, rc.4, rc.5) whose failures are drawn from the fake failure
library.

**Why it exists:** Supplies realistic multi-run demo data so the NO-GO / HOLD
/ GO decision paths can all be seen without real tests running.
