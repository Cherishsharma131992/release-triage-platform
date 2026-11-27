import { describe, expect, it } from 'vitest';
import { planStep, planTestCase } from '../../src/integrations/playwright-mcp/stepPlan';

const step = (action: string, expected = '') => ({ index: 1, action, expected });
const base = 'https://shop.example.com/app';

describe('step plan', () => {
  it.each([
    ['Navigate to /login', 'browser_navigate', { url: 'https://shop.example.com/app/login' }],
    ['Open https://x.io', 'browser_navigate', { url: 'https://x.io' }],
    ['Click button "Sign in"', 'browser_click', { element: 'Sign in', target: 'getByRole("button", { name: "Sign in" })' }],
    ['Click "Cart"', 'browser_click', { element: 'Cart', target: 'getByText("Cart", { exact: true })' }],
    ['Click {getByTestId("checkout")}', 'browser_click', { element: '{getByTestId("checkout")}', target: 'getByTestId("checkout")' }],
    ['Enter "a@b.c" into "Email"', 'browser_type', { element: 'Email', target: 'getByLabel("Email")', text: 'a@b.c' }],
    ['Fill "Password" with "s3cret"', 'browser_type', { element: 'Password', target: 'getByLabel("Password")', text: 's3cret' }],
    ['Select "EUR" from "Currency"', 'browser_select_option', { element: 'Currency', target: 'getByLabel("Currency")', values: ['EUR'] }],
    ['Press Enter', 'browser_press_key', { key: 'Enter' }],
    ['Wait 2 seconds', 'browser_wait_for', { time: 2 }],
    ['Verify text "Welcome back" is visible', 'browser_wait_for', { text: 'Welcome back', time: 10 }],
    ['Verify "Loading" is not visible', 'browser_wait_for', { textGone: 'Loading', time: 10 }],
  ])('%s', (action, tool, args) => {
    const [a] = planStep(step(action), base);
    expect(a.tool).toBe(tool);
    expect(a.args).toEqual(args);
  });

  it('asserts quoted expected results and ignores Zephyr test data suffix', () => {
    const plan = planStep(step('Click "Pay" [data: card 4242]', 'Shows "Order confirmed" and "Receipt"'), base);
    expect(plan.map((p) => p.args.text ?? p.tool)).toEqual(['browser_click', 'Order confirmed', 'Receipt']);
  });

  it('rejects free-text steps instead of guessing', () => {
    expect(() => planStep(step('Log in as a premium customer'), base)).toThrow(/not in the automatable step format/);
    expect(() => planStep(step('Navigate to /x'), null)).toThrow(/PLAYWRIGHT_BASE_URL/);
    expect(() => planTestCase([], base)).toThrow(/no steps/);
  });
});
