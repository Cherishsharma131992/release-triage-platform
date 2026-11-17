import { expect, test } from '@playwright/test';
import { zephyr } from './support';

test('Add a product to the cart', async ({ page }) => {
  await zephyr('DEMO-T5', 'e2e/cart.spec.ts');
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add Desk Lamp to cart' }).click();
  await expect(page.getByRole('status')).toHaveText('Added to cart');
});

test('Empty cart shows empty state', async ({ page }) => {
  await zephyr('DEMO-T14', 'e2e/cart.spec.ts');
  await page.goto('/cart');
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
