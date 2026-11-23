# The Whole Platform in Plain Words

Think of this platform as a **quality gatekeeper for software releases**.

Your QA automation suite runs hundreds of tests. Some fail. A human would
normally spend hours checking each failure: "Is it a real bug? A flaky test?
A known issue already in Jira? An environment problem?" — and then decide
whether the release can ship.

This platform does that job automatically:

1. **Collects** the failures from the test report (Allure).
2. **Fingerprints** each failure so identical errors can be recognised again.
3. **Compares** each failure with every past run (history).
4. **Searches Jira** for a bug that already describes it.
5. **Classifies** it with AI: real bug, known bug, flaky, environment issue,
   missing test data, bad test script, or "can't tell".
6. **Re-runs** it in a real browser (Playwright) to see if it fails again.
7. **Decides** GO, NO-GO or HOLD using a fixed, visible rulebook — never a
   guess. A person can record a "waiver" (an official accept-the-risk note).
8. **Shows everything** on a one-page dashboard where every claim links to
   its evidence: screenshots, logs, Jira tickets, re-run results.

Nothing is hidden: every assessment stores who/what made each call, the exact
version of the rules used, and timestamps, so the decision is auditable later.
