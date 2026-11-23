# File: `web/src/App.tsx`

**What it is:** The whole dashboard page. It loads the latest assessment
from the API, lays out all the panels (decision banner, health, criteria,
classification summary, validation summary, defects, failures table),
handles the failure drawer opening, the release-candidate picker, and the
"re-assess" action after a waiver is recorded.

**Why it exists:** This is the single-page executive view the platform was
built around — everything else on the web side is a piece of it.
