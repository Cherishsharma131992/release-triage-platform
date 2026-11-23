# File: `server/src/pipeline/jiraCorrelation.ts`

**What it is:** The matchmaker between failures and Jira issues. It scores
candidates by several methods: a direct test-case link (strongest), matching
error text/keywords, shared components, and test-key mentions. It returns
the best match plus how it matched and its score — or nothing if no issue is
close enough.

**Why it exists:** Correctly saying "this failure is already tracked as
SCRUM-5" is worth a lot; wrongly saying it is worse than saying nothing, so
matches need evidence.
