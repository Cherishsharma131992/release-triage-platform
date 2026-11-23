# File: `web/src/components/DefectsPanel.tsx`

**What it is:** The Jira issues relevant to this release — key, summary,
status, severity, release impact (BLOCKING/MEDIUM/LOW), waiver state — with
links to Jira and the "record waiver" action.

**Why it exists:** Known defects are a release decision unto themselves;
this makes them explicit instead of buried in failure rows.
