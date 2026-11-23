# File: `web/src/components/ClassificationPanel.tsx`

**What it is:** Summary of the AI's verdicts: how many failures were
classified as application defects, timing, environment, test-data,
automation-script issues, etc., with confidence.

**Why it exists:** Turns "6 failures" into "1 real bug + 2 flaky + 1 known
Jira + 2 infra issues" — the picture a stakeholder actually needs.
