# File: `server/src/store/seed.ts`

**What it is:** Fills an empty database with the demo's fake history and
waivers (computed with the real fingerprint code, so matching behaves
realistically). Runs once, only when needed, and only in mock/file mode.

**Why it exists:** A brand-new checkout demos correctly out of the box.
