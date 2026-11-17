import { expect, test } from '@playwright/test';
import { zephyr } from './support';

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await Promise.all([page.waitForResponse('**/login'), page.getByRole('button', { name: 'Sign in' }).click()]);
}

test('Sign in with valid credentials', async ({ page }) => {
  await zephyr('DEMO-T1', 'e2e/auth.spec.ts');
  await signIn(page, 'qa@shop.test', 'Passw0rd!');
  await expect(page.getByRole('heading')).toHaveText('Welcome back, QA');
});

test('Sign in rejects a wrong password', async ({ page }) => {
  await zephyr('DEMO-T2', 'e2e/auth.spec.ts');
  await signIn(page, 'qa@shop.test', 'wrong');
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});

test('Loyalty customer can sign in', async ({ page }) => {
  await zephyr('DEMO-T12', 'e2e/auth.spec.ts');
  await signIn(page, 'loyal@shop.test', 'Loyal123!');
  if (await page.getByRole('alert').count()) {
    throw new Error('Test data missing: loyalty account loyal@shop.test not found in seed data for local-demo');
  }
});
