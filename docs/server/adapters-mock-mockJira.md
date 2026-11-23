# File: `server/src/adapters/mock/mockJira.ts`

**What it is:** Pretends to be Jira. Holds the fake issues from
`data/jiraIssues.ts` and answers fetch/search requests in the same shape as
the real adapter.

**Why it exists:** Lets "is this failure a known defect?" be demonstrated
without a Jira account.
