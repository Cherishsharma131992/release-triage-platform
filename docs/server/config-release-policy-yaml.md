# File: `server/config/release-policy.yaml`

**What it is:** The **release rulebook**, in a readable YAML file. It
declares the thresholds and hard rules, e.g. minimum pass rate, whether
business-critical failures block, whether open critical defects block,
whether a valid waiver can lift a defect, confidence floors, and how many
re-run attempts to make.

**Why it exists:** The go/no-go logic lives here as data, not buried in code
— release managers can read and change the rules without touching the
engine. Its version and hash are stored with every decision.
