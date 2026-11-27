import { expect, test } from '@playwright/test';
import { zephyr } from '../integrations/zephyr/zephyrLink';

test('Product catalog lists all products', async ({ page }) => {
  await zephyr('DEMO-T3', 'automation-scripts/catalog.spec.ts');
  await page.goto('/products');
  await expect(page.getByText('4 result(s)')).toBeVisible();
});

test('Product search is case-insensitive', async ({ page }) => {
  await zephyr('DEMO-T4', 'automation-scripts/catalog.spec.ts');
  await page.goto('/products?q=lamp');
  await expect(page.getByRole('heading', { name: 'Desk Lamp' })).toBeVisible({ timeout: 3_000 });
});

test('Product cards show formatted prices', async ({ page }) => {
  await zephyr('DEMO-T10', 'automation-scripts/catalog.spec.ts');
  await page.goto('/products');
  // Script bug on purpose: the page uses `.price`, not `.price-tag`.
  const price = await (await page.$('.price-tag'))!.textContent();
  expect(price).toBe('€40.00');
});
