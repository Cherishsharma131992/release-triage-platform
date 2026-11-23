# File: `web/src/components/CriteriaPanel.tsx`

**What it is:** Lists every release-policy check that ran — its name, PASS or
FAIL, and the evidence behind it (e.g. "pass rate 57% < 80%").

**Why it exists:** The decision is only trustworthy if each rule that fired
is visible — this is the audit view of the rulebook.
