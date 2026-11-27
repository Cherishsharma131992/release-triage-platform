# Allure reports

Allure results written by the `allure-playwright` reporter (contents are git-ignored):

- `local/` — `npm run e2e -w demo` (override with `ALLURE_RUN_DIR`).
- `live/<run-id>/` — one folder per `npm run demo:live` execution; the platform watches `live/` (`ALLURE_RESULTS_DIR`).

Render an HTML report from any folder with the Allure CLI, e.g. `npx allure-commandline generate allure-reports/local -o allure-reports/html --clean` (needs Java).
