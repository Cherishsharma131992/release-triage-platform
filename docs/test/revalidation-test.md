# `server/test/revalidation.test.ts`

Checks re-run verdicts: same unmet expectation counts as REPRODUCED even when
worded differently, mixed results = INTERMITTENT, clean pass =
NOT_REPRODUCED, different error = DIFFERENT_FAILURE, browser errors =
INCONCLUSIVE.
