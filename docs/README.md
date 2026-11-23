# Failure Triage Platform — File-by-File Guide (Plain English)

This folder explains **every file in the repository in everyday language**. No
programming background needed. Each page answers three questions:

1. **What does this file do?**
2. **Why does it exist?**
3. **Where does it fit in the bigger picture?**

## How the platform works in 60 seconds

When a test run finishes, the platform: collects the failures → fingerprints each
one → checks if it has been seen before → looks for a matching Jira bug → asks
the AI to classify it → re-runs the test in a real browser if allowed → applies
a fixed rulebook (the release policy) → shows GO, NO-GO or HOLD on a dashboard.

## Contents

### Big picture
- [overview.md](overview.md) — the whole platform on one page
- [data-flow.md](data-flow.md) — what happens to a test result, step by step

### Server (the brain) — `server/src/`
- [Domain & shared shapes](server/domain-types.md)
- Adapters (the "translators" to external tools):
  [contract](server/adapters-types.md) ·
  [chooser](server/adapters-live-index.md) ·
  [Allure reader](server/adapters-live-allureResults.md) ·
  [Zephyr](server/adapters-live-zephyrScale.md) ·
  [Jira Cloud](server/adapters-live-jiraCloud.md) ·
  [browser re-runs](server/adapters-live-playwrightMcp.md) ·
  [step translator](server/adapters-live-stepPlan.md) ·
  [HTTP helper](server/adapters-live-http.md) ·
  [file adapters](server/adapters-live-fileAdapters.md)
- Mock adapters (pretend systems for demo/testing):
  [factory](server/adapters-mock-index.md) ·
  [Allure](server/adapters-mock-mockAllure.md) ·
  [Zephyr](server/adapters-mock-mockZephyr.md) ·
  [Jira](server/adapters-mock-mockJira.md) ·
  [Playwright](server/adapters-mock-mockPlaywrightMcp.md) ·
  [artifacts](server/adapters-mock-artifacts.md) ·
  [failure data](server/adapters-mock-data-failures.md) ·
  [Jira data](server/adapters-mock-data-jiraIssues.md) ·
  [test-case data](server/adapters-mock-data-testCases.md)
- AI (the "thinking" part):
  [contract](server/ai-provider.md) ·
  [chooser](server/ai-index.md) ·
  [heuristic brain](server/ai-heuristicProvider.md) ·
  [LLM option](server/ai-llmProvider.md)
- Pipeline (the assembly line):
  [orchestrator](server/pipeline-assessmentService.md) ·
  [fingerprint](server/pipeline-fingerprint.md) ·
  [history](server/pipeline-history.md) ·
  [Jira matching](server/pipeline-jiraCorrelation.md) ·
  [re-runs](server/pipeline-revalidation.md) ·
  [watcher](server/pipeline-watcher.md)
- Policy (the rulebook):
  [engine](server/policy-engine.md) ·
  [loader](server/policy-policy.md) ·
  [release-policy.yaml](server/config-release-policy-yaml.md)
- Storage & startup:
  [database](server/store-store.md) ·
  [seed data](server/store-seed.md) ·
  [API routes](server/app.md) ·
  [bootstrap](server/bootstrap.md) ·
  [settings](server/config.md) ·
  [entry point](server/index.md) ·
  [ids](server/util-ids.md) ·
  [text helpers](server/util-text.md)
- Tests: [one page per test file](test/)

### Web dashboard (the face) — `web/`
- [App](web/App.md) · [API client](web/api.md) · [startup](web/main.md) ·
  [page shell](web/index-html.md) · [styles](web/styles.md) ·
  [build config](web/vite-config.md)
- Components:
  [Decision banner](web/DecisionBanner.md) ·
  [Health](web/HealthPanel.md) ·
  [Criteria](web/CriteriaPanel.md) ·
  [Classifications](web/ClassificationPanel.md) ·
  [Validation](web/ValidationPanel.md) ·
  [Defects](web/DefectsPanel.md) ·
  [Failures table](web/FailuresTable.md) ·
  [Failure drawer](web/FailureDrawer.md) ·
  [Audit footer](web/AuditFooter.md)

### Demo — `demo/`
- [Demo runner](demo/run-live-demo.md) ·
  [Shop app](demo/shop-app-server.md) ·
  [Playwright config](demo/playwright-config.md) ·
  [Zephyr helper](demo/e2e-support.md) ·
  [Zephyr data](demo/data-zephyr-testcases.md) ·
  [Jira data](demo/data-jira-issues.md)
- Test suites: [api](demo/e2e-api.md) · [auth](demo/e2e-auth.md) ·
  [cart](demo/e2e-cart.md) · [catalog](demo/e2e-catalog.md) ·
  [checkout](demo/e2e-checkout.md) · [home](demo/e2e-home.md)

### Build & config files
- [root package.json](root-package.md) ·
  [server package.json](server-package.md) ·
  [web package.json](web-package.md) ·
  [demo package.json](demo-package.md) ·
  [.env.example](env-example.md) ·
  [.gitignore](gitignore.md) ·
  [.nvmrc](nvmrc.md) ·
  [package-lock.json](package-lock.md) ·
  [TypeScript configs](tsconfigs.md) ·
  [README.md](readme.md)
