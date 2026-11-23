# File: `web/src/components/HealthPanel.tsx`

**What it is:** Shows each integration's status (Allure, Zephyr, Jira,
Playwright) as OK or UNAVAILABLE, with its message. Also shows release
health stats.

**Why it exists:** A decision made with a dead integration is suspect — this
makes the plumbing visible at a glance.
