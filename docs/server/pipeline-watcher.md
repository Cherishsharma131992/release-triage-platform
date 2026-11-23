# File: `server/src/pipeline/watcher.ts`

**What it is:** The scanner. On a timer it lists finished executions, skips
ones already assessed, and triages the new ones (oldest first). There's also
a webhook so CI can push a notification instead of waiting for the poll.

**Why it exists:** The platform reacts automatically when a test run
completes — nobody has to press a button.
