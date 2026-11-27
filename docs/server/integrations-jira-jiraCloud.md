# File: `server/src/integrations/jira/jiraCloud.ts`

**What it is:** Talks to the real **Jira Cloud REST API (v3)** using your
email + API token. It fetches issues by key, runs searches, and translates
Jira's format into the platform's `JiraIssue` shape — including converting
Jira's document format (ADF) into plain text and deriving severity from
priority when there's no dedicated severity field.

**Why it exists:** "Is this failure already a known bug?" is answered here.

**Env vars:** `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`,
`JIRA_PROJECT_KEYS`, `JIRA_BUG_ISSUE_TYPES`, `JIRA_SEVERITY_FIELD`.
This is the adapter verified against your `cherish131992.atlassian.net` site.
