import { expect, test } from '@playwright/test';
import { zephyr } from './support';

test('Home page loads', async ({ page }) => {
  await zephyr('DEMO-T13', 'e2e/home.spec.ts');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo Shop');
});

test('Home page shows recommendations', async ({ page }) => {
  await zephyr('DEMO-T9', 'e2e/home.spec.ts');
  await page.goto('/');
  // Too-short wait on purpose: recommendations load after 1-3s, so this fails on timing, not on a product bug.
  await expect(page.locator('#recs')).toHaveText('Desk Lamp, Monitor Arm', { timeout: 800 });
});
