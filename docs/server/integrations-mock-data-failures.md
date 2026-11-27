# File: `server/src/integrations/mock-data/failures.ts`

**What it is:** The mock storybook: a library of fake failures (error
messages, stack traces), seeds of *past* executions (so history matching has
something to find), and pre-approved waivers.

**Why it exists:** Defines the cast of characters for the mock demo — the
real-bug failure, the flaky one, the known-Jira one, the environment one —
and the history that makes "seen before?" answerable.
