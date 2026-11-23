# File: `server/src/adapters/live/http.ts`

**What it is:** A small shared toolkit for talking to real web APIs. It adds
timeouts (so a hung server can't hang us), turns error replies into readable
errors **without leaking API tokens**, converts JSON safely, and strips HTML
tags out of text fields (`stripHtml`).

Also exports `requireEnv`, which fails fast with a clear message when a
required setting (like `JIRA_BASE_URL`) is missing.

**Why it exists:** Jira and Zephyr adapters share the same boring plumbing;
it lives here once instead of twice.
