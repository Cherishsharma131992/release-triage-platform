# File: `server/src/domain/types.ts`

**What it is:** The project's dictionary. It defines, in TypeScript, what
every important *thing* looks like: an Execution (one test run), a TestResult
(pass/fail), a TestCase (the Zephyr test it came from), a JiraIssue, a
Waiver, a FailureRecord, an Assessment, the release Decision, and so on.

**Why it exists:** Every other file talks in these shapes. If the pipeline
says "this is a FailureRecord", both the AI code and the dashboard know
exactly which fields that means — no ambiguity.

**Where it fits:** The foundation. Everything else builds on it. It contains
no logic, only definitions.
