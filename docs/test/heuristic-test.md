# `server/test/heuristic.test.ts`

Checks the built-in brain's judgement: a wrong "Received:" value points to a
real defect, "Loading…" points to timing, and a timing failure reproduced on
every re-run is upgraded to an application defect.
