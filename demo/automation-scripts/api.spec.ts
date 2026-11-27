import { expect, test } from '@playwright/test';
import { zephyr } from '../integrations/zephyr/zephyrLink';

test('Inventory service is healthy', async ({ request }) => {
  await zephyr('DEMO-T11', 'automation-scripts/api.spec.ts');
  // The inventory service is intentionally not started in the demo environment.
  const res = await request.get(process.env.INVENTORY_URL ?? 'http://127.0.0.1:4199/health');
  expect(res.status()).toBe(200);
});
