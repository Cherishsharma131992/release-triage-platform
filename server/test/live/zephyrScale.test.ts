import { describe, expect, it } from 'vitest';
import { ZephyrScaleAdapter, zephyrConfigFromEnv } from '../../src/integrations/zephyr/zephyrScale';
import { fakeFetch } from './fakeFetch';

describe('ZephyrScaleAdapter', () => {
  it('maps test cases, steps, priority and custom fields; skips unknown keys', async () => {
    const f = fakeFetch({
      '/testcases/SHOP-T1': () => ({
        key: 'SHOP-T1',
        name: 'Guest checkout',
        objective: '<p>Buy &amp; pay</p>',
        priority: { id: 7 },
        labels: ['playwright-revalidation'],
        customFields: { 'Automation Script': 'tests/checkout.spec.ts', 'Business Critical': true, Component: 'Checkout' },
      }),
      '/testcases/SHOP-T1/teststeps': (u) =>
        u.searchParams.get('startAt') === '0'
          ? { values: [{ inline: { description: 'Navigate to /cart', expectedResult: 'Cart shows "1 item"', testData: '' } }], isLast: false }
          : { values: [{ testCase: { testCaseKey: 'SHOP-T9' } }], isLast: true },
      '/priorities/7': () => ({ id: 7, name: 'High' }),
    });
    const a = new ZephyrScaleAdapter({ ...zephyrConfigFromEnv({ ZEPHYR_API_TOKEN: 't' }), fetchImpl: f.impl });
    const cases = await a.getTestCases(['SHOP-T1', 'SHOP-T404']);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      key: 'SHOP-T1',
      objective: 'Buy & pay',
      component: 'Checkout',
      priority: 'High',
      businessCritical: true,
      automationScript: 'tests/checkout.spec.ts',
      playwrightRevalidationApproved: true,
    });
    expect(cases[0].steps).toEqual([
      { index: 1, action: 'Navigate to /cart', expected: 'Cart shows "1 item"' },
      { index: 2, action: 'Call test case SHOP-T9', expected: '' },
    ]);
    expect(f.calls[0].headers.Authorization).toBe('Bearer t');
    expect(f.calls[0].url.origin).toBe('https://api.zephyrscale.smartbear.com');
  });

  it('defaults to not approved / not critical', async () => {
    const f = fakeFetch({
      '/testcases/X-T2': () => ({ key: 'X-T2', name: 'n', priority: null, labels: [], customFields: {} }),
      '/testcases/X-T2/teststeps': () => ({ values: [], isLast: true }),
    });
    const [tc] = await new ZephyrScaleAdapter({ ...zephyrConfigFromEnv({ ZEPHYR_API_TOKEN: 't' }), fetchImpl: f.impl }).getTestCases(['X-T2']);
    expect(tc).toMatchObject({ priority: 'Normal', businessCritical: false, playwrightRevalidationApproved: false, component: 'Unassigned' });
  });
});
