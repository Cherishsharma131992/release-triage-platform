# File: `package.json` (root)

**What it is:** The control panel for the whole project. It declares that the
repo is a *workspace* made of three parts (`server`, `web`, `demo`) and
defines the top-level commands you actually type:

- `npm run build` — builds server + dashboard
- `npm test` — runs all unit tests
- `npm run demo:live` — the full self-contained demo
- `npm start` — run the platform server

**Why it exists:** One file = one place to run everything from.
