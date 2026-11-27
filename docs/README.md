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
- Integrations (the "translators" to external tools) — `server/src/integrations/`:
  [contract](server/integrations-types.md) ·
  [chooser](server/integrations-index.md) ·
  [mock factory](server/integrations-mock.md)
  - Jira — `jira/`: [Jira Cloud](server/integrations-jira-jiraCloud.md) ·
    [file export](server/integrations-file-adapters.md) ·
    [Jira seed data](server/data-seeds-jira-issues.md)
  - Zephyr — `zephyr/`: [Zephyr Scale](server/integrations-zephyr-zephyrScale.md) ·
    [file export](server/integrations-file-adapters.md) ·
    [mock](server/integrations-zephyr-mockZephyr.md)
  - Allure — `allure/`: [results reader](server/integrations-allure-allureResults.md) ·
    [mock](server/integrations-allure-mockAllure.md)
  - Playwright MCP — `playwright-mcp/`: [browser re-runs](server/integrations-playwright-mcp-playwrightMcp.md) ·
    [step translator](server/integrations-playwright-mcp-stepPlan.md) ·
    [mock](server/integrations-playwright-mcp-mockPlaywrightMcp.md)
  - Shared — `shared/`, `mock-data/`: [HTTP helper](server/integrations-shared-http.md) ·
    [artifacts](server/integrations-shared-artifacts.md) ·
    [failure data](server/integrations-mock-data-failures.md) ·
    [test-case data](server/integrations-mock-data-testCases.md)
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

### Demo test automation framework — `demo/`
- [Demo runner](demo/run-live-demo.md) ·
  [Playwright config](demo/playwright-config.md)
- Application under test — `application/`: [Shop app](demo/application-server.md)
- Automation scripts — `automation-scripts/`: [api](demo/automation-scripts-api.md) ·
  [auth](demo/automation-scripts-auth.md) · [cart](demo/automation-scripts-cart.md) ·
  [catalog](demo/automation-scripts-catalog.md) · [checkout](demo/automation-scripts-checkout.md) ·
  [home](demo/automation-scripts-home.md)
- Jira & Zephyr — `integrations/`: [Zephyr link helper](demo/integrations-zephyr-zephyrLink.md) ·
  [Zephyr data](demo/integrations-zephyr-testcases.md) ·
  [Jira data](demo/integrations-jira-issues.md)
- Allure reports — `allure-reports/`: results per run (`local/`, `live/<run>`), git-ignored

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
  [README.md](root-readme.md)
