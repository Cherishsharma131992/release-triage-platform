import { defineConfig } from '@playwright/test';

const env = process.env;
const headed = env.HEADED === '1' || env.HEADED === 'true';

export default defineConfig({
  testDir: './e2e',
  timeout: 15_000,
  retries: 0,
  workers: headed ? 1 : 4,
  use: {
    baseURL: env.SHOP_URL ?? 'http://127.0.0.1:4100',
    screenshot: 'only-on-failure',
    headless: !headed,
    launchOptions: {
      ...(env.DEMO_CHROME_PATH ? { executablePath: env.DEMO_CHROME_PATH } : {}),
      // Slow headed runs down so they can be followed on screen.
      ...(headed ? { slowMo: Number(env.SLOW_MO ?? 400) } : {}),
    },
  },
  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: env.ALLURE_RUN_DIR ?? 'allure-results/local',
        environmentInfo: { RELEASE: env.DEMO_RELEASE ?? '1.0.0', BUILD: env.DEMO_BUILD ?? 'local', ENVIRONMENT: 'local-demo' },
      },
    ],
  ],
});
