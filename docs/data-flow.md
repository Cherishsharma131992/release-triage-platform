# What Happens to One Test Result

1. A test run finishes (CI or the demo). Its results land as Allure files.
2. The **watcher** notices the new execution and starts an **assessment**.
3. Each failed test is looked up in **Zephyr** to learn what it was supposed
   to verify and whether it is business-critical.
4. The failure gets a **fingerprint** (a signature built from the error).
5. The fingerprint is compared with the **history** in the database:
   "Have we seen this before? How often? Was it flaky?"
6. **Jira** is searched for a matching bug (by test key, text similarity,
   components).
7. The **AI provider** combines all of the above into a classification with
   confidence, reasoning and a recommended action.
8. If the Zephyr test is approved for re-runs, the **Playwright adapter**
   replays its steps in a real browser up to 3 times.
9. The **policy engine** applies the release rulebook and produces the
   GO / NO-GO / HOLD decision plus a risk score.
10. Everything is saved to the **SQLite store** and shown on the dashboard.
