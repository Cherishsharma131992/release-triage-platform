import { expect, test, type Page } from '@playwright/test';
import { zephyr } from '../integrations/zephyr/zephyrLink';

async function checkout(page: Page, product: string, country: string) {
  await page.goto('/products');
  await page.getByRole('button', { name: `Add ${product} to cart` }).click();
  await page.goto('/cart');
  await page.getByLabel('Country').selectOption(country);
}

test('Checkout applies 19% German VAT', async ({ page }) => {
  await zephyr('DEMO-T6', 'automation-scripts/checkout.spec.ts');
  await checkout(page, 'Standing Desk', 'Germany');
  await expect(page.locator('#vat')).toHaveText('€76.00', { timeout: 3_000 });
  await expect(page.locator('#total')).toHaveText('€476.00');
});

test('Checkout applies 20% French VAT', async ({ page }) => {
  await zephyr('DEMO-T7', 'automation-scripts/checkout.spec.ts');
  await checkout(page, 'Desk Lamp', 'France');
  await expect(page.locator('#vat')).toHaveText('€8.00');
  await expect(page.locator('#total')).toHaveText('€48.00');
});

test('Placing an order shows confirmation', async ({ page }) => {
  await zephyr('DEMO-T8', 'automation-scripts/checkout.spec.ts');
  await checkout(page, 'Office Chair', 'Germany');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.locator('#result')).toHaveText('Order confirmed');
});
