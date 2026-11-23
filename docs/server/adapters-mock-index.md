# File: `server/src/adapters/mock/index.ts`

**What it is:** The factory that builds the four **pretend** adapters
(mock Allure, mock Zephyr, mock Jira, mock Playwright). It also supports
`mockUnavailable` — you can declare one mock "down" to test how the
dashboard shows an integration failure.

**Why it exists:** Development, tests and the original dashboard demo ran
entirely on these fakes before any real accounts existed.
