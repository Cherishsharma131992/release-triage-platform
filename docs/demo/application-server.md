# File: `demo/application/server.mjs`

**What it is:** A tiny self-contained web shop (no dependencies, plain
Node): home page with recommendations, product catalog + search, cart,
checkout with VAT by country, login, and a health endpoint. It deliberately
contains bugs toggled via `BUGS=`: `vat` (German VAT computed wrong) and
`search` (case-sensitive search), plus a slow recommendations widget.

**Why it exists:** A real application under test — so the demo has real
failures for the platform to triage, not canned ones.
