# File: `server/data-seeds/jira-issues.json`

**What it is:** The bundled set of fake Jira issues (SHOP-*) used when the
defect tracker runs in `mock` mode. It is plain JSON read by the **file
adapter** — there is no separate mock Jira adapter anymore since live Jira
works.

**Why it exists:** The no-credentials demo and the unit tests still need a
stand-in defect list to match SHOP-* failures against (SHOP-1301 etc.).

**Where it fits:** `mock`/`file` defects mode only. With `DEFECTS_ADAPTER=live`
this file is never touched — real issues come from your Jira site.
