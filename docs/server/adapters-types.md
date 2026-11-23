# File: `server/src/adapters/types.ts`

**What it is:** The *contract* every connector must sign. It says:

- an **AutomationResultsAdapter** must be able to list executions and fetch
  one in full;
- a **TestCaseManagementAdapter** must be able to fetch test cases by key;
- a **DefectTrackerAdapter** must fetch and search Jira-style issues;
- a **RevalidationAdapter** must be able to re-run one test case;
- all of them must answer a `healthCheck()` ("are you working?").

**Why it exists:** Because of this contract the rest of the platform doesn't
care whether a failure came from real Allure, a JSON file, or fake demo data
— they all look identical. Swapping mock for live changes nothing upstream.
