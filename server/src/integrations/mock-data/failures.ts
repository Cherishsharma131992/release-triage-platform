export interface FailureSeed {
  testCaseKey: string;
  status: 'failed' | 'broken';
  errorMessage: string;
  stackTrace: string;
}

function stack(script: string, fn: string, line: number, extra: string[] = []): string {
  return [
    ...extra,
    `    at ${fn} (/builds/shop-e2e/${script}:${line}:15)`,
    `    at /builds/shop-e2e/node_modules/@playwright/test/lib/worker/workerMain.js:331:9`,
    `    at runNextTicks (node:internal/process/task_queues:60:5)`,
  ].join('\n');
}

export const FAILURE_LIBRARY: Record<string, FailureSeed> = {
  'SHOP-T205': {
    testCaseKey: 'SHOP-T205',
    status: 'failed',
    errorMessage:
      "Error: expect(locator).toHaveCount(expected)\nExpected: 20\nReceived: 19\nLocator: getByTestId('search-result-card') on results page 2",
    stackTrace: stack('tests/search/pagination.spec.ts', 'SearchPage.verifyPageSize', 48),
  },
  'SHOP-T301': {
    testCaseKey: 'SHOP-T301',
    status: 'failed',
    errorMessage:
      "Error: expect(locator).toHaveText(expected)\nExpected: \"-$10.00\"\nReceived: \"$0.00\"\nPromo code SAVE10 accepted but discount line not applied to cart subtotal",
    stackTrace: stack('tests/cart/promo.spec.ts', 'CartPage.verifyDiscount', 77),
  },
  'SHOP-T402': {
    testCaseKey: 'SHOP-T402',
    status: 'failed',
    errorMessage:
      "Error: expect(locator).toHaveText(expected)\nExpected: \"€121.00\"\nReceived: \"€100.00\"\nCheckout order total does not include VAT tax for shipping address in Germany (EU)",
    stackTrace: stack('tests/checkout/totals.spec.ts', 'CheckoutPage.verifyOrderTotal', 112),
  },
  'SHOP-T405': {
    testCaseKey: 'SHOP-T405',
    status: 'failed',
    errorMessage:
      "Error: expect(locator).toHaveText(expected)\nExpected: \"Order confirmed\"\nReceived: \"Payment failed. Please try again.\"\nPOST /api/payments/charge responded 500 Internal Server Error (correlationId 7f3e2b1c-55aa-4e0b-9c1d-2a6b8e9f0d11)",
    stackTrace: stack('tests/payments/saved-card.spec.ts', 'PaymentPage.placeOrderWithSavedCard', 64),
  },
  'SHOP-T512': {
    testCaseKey: 'SHOP-T512',
    status: 'broken',
    errorMessage:
      "TimeoutError: locator.click: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Apply filters' })\n  - element is not stable - waiting for animation to finish",
    stackTrace: stack('tests/orders/history-filters.spec.ts', 'OrderHistoryPage.applyStatusFilter', 39),
  },
  'SHOP-T610': {
    testCaseKey: 'SHOP-T610',
    status: 'broken',
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'setInputFiles')",
    stackTrace: stack('tests/pages/ProfilePage.ts', 'ProfilePage.uploadAvatar', 88, [
      '    at ProfilePage.uploadAvatar (/builds/shop-e2e/tests/pages/ProfilePage.ts:88:31)',
    ]),
  },
  'SHOP-T702': {
    testCaseKey: 'SHOP-T702',
    status: 'broken',
    errorMessage:
      'Error: connect ECONNREFUSED 10.0.4.17:8443\nRequest to reports-service (GET /internal/reports/sales/export) failed while generating CSV export',
    stackTrace: stack('tests/admin/export.spec.ts', 'AdminReportsPage.exportSales', 52),
  },
  'SHOP-T215': {
    testCaseKey: 'SHOP-T215',
    status: 'failed',
    errorMessage:
      "Error: expect(received).toBeGreaterThan(expected)\nExpected: > 0\nReceived: 0\nSearch for SKU 'SKU-TEST-9981' returned no products - test data SKU-TEST-9981 not found in catalog",
    stackTrace: stack('tests/search/sku.spec.ts', 'SearchPage.searchBySku', 27),
  },
  'SHOP-T803': {
    testCaseKey: 'SHOP-T803',
    status: 'failed',
    errorMessage:
      "Error: expect(received).toContain(expected)\nExpected substring: \"Your order has shipped\"\nReceived string: \"\"\nMailbox poll returned 0 messages for qa+shipment@shop.example.com",
    stackTrace: stack('tests/notifications/shipment-email.spec.ts', 'MailboxHelper.waitForEmail', 41),
  },
  'SHOP-T120': {
    testCaseKey: 'SHOP-T120',
    status: 'failed',
    errorMessage:
      "Error: expect(page).toHaveURL(expected)\nExpected pattern: /reset-password\\/confirm/\nReceived string: \"https://staging.shop.example.com/login?error=token_invalid\"\nPassword reset token rejected immediately after issue",
    stackTrace: stack('tests/auth/password-reset.spec.ts', 'PasswordResetPage.completeReset', 58),
  },
};

export interface ExecutionSeed {
  executionId: string;
  release: string;
  build: string;
  environment: string;
  startedAt: string;
  finishedAt: string;
  failing: string[];
  skipped: string[];
}

export const EXECUTION_SEEDS: ExecutionSeed[] = [
  {
    executionId: 'exec-2.14.0-rc.3',
    release: '2.14.0',
    build: '2.14.0-rc.3',
    environment: 'staging',
    startedAt: '2026-11-10T06:00:00Z',
    finishedAt: '2026-11-10T06:42:13Z',
    failing: ['SHOP-T205', 'SHOP-T301', 'SHOP-T402', 'SHOP-T405', 'SHOP-T512', 'SHOP-T610', 'SHOP-T702', 'SHOP-T215', 'SHOP-T803', 'SHOP-T120'],
    skipped: ['SHOP-T110', 'SHOP-T903'],
  },
  {
    executionId: 'exec-2.14.0-rc.4',
    release: '2.14.0',
    build: '2.14.0-rc.4',
    environment: 'staging',
    startedAt: '2026-11-13T06:00:00Z',
    finishedAt: '2026-11-13T06:39:51Z',
    failing: ['SHOP-T205', 'SHOP-T301', 'SHOP-T512', 'SHOP-T120'],
    skipped: ['SHOP-T110'],
  },
  {
    executionId: 'exec-2.14.0-rc.5',
    release: '2.14.0',
    build: '2.14.0-rc.5',
    environment: 'staging',
    startedAt: '2026-11-16T06:00:00Z',
    finishedAt: '2026-11-16T06:38:02Z',
    failing: ['SHOP-T205', 'SHOP-T512', 'SHOP-T702'],
    skipped: ['SHOP-T110'],
  },
];

/** Historical failures from earlier releases (already triaged) used to seed the history store. */
export const HISTORY_SEEDS: Array<{
  executionId: string;
  release: string;
  build: string;
  executedAt: string;
  testCaseKey: string;
  jiraKey: string | null;
  classification: string;
}> = [
  { executionId: 'exec-2.13.0-rc.2', release: '2.13.0', build: '2.13.0-rc.2', executedAt: '2026-08-01T06:00:00Z', testCaseKey: 'SHOP-T205', jiraKey: 'SHOP-1180', classification: 'APPLICATION_DEFECT' },
  { executionId: 'exec-2.13.0-rc.4', release: '2.13.0', build: '2.13.0-rc.4', executedAt: '2026-09-10T06:00:00Z', testCaseKey: 'SHOP-T205', jiraKey: 'SHOP-1180', classification: 'APPLICATION_DEFECT' },
  { executionId: 'exec-2.13.0-rc.4', release: '2.13.0', build: '2.13.0-rc.4', executedAt: '2026-09-10T06:00:00Z', testCaseKey: 'SHOP-T301', jiraKey: 'SHOP-1192', classification: 'APPLICATION_DEFECT' },
  { executionId: 'exec-2.12.0-rc.1', release: '2.12.0', build: '2.12.0-rc.1', executedAt: '2026-05-18T06:00:00Z', testCaseKey: 'SHOP-T803', jiraKey: null, classification: 'FLAKY' },
  { executionId: 'exec-2.13.0-rc.2', release: '2.13.0', build: '2.13.0-rc.2', executedAt: '2026-08-01T06:00:00Z', testCaseKey: 'SHOP-T803', jiraKey: null, classification: 'FLAKY' },
];

/** Waivers / risk acceptances approved by the business. */
export const WAIVER_SEEDS = [
  {
    id: 'WVR-0001',
    jiraKey: 'SHOP-1180',
    release: '2.14.0',
    approvedBy: 'Priya Raman',
    approverRole: 'VP Product',
    approvedAt: '2026-11-05T09:30:00Z',
    expiresAt: '2027-03-31T23:59:59Z',
    justification: 'Cosmetic pagination off-by-one; no revenue impact. Fix scheduled for 2.15.0.',
  },
];

export type RevalidationScenario = 'pass' | 'fail_same' | 'mcp_error' | Array<'pass' | 'fail_same'>;

/** Behaviour of the mock Playwright MCP server per test case. Unlisted tests pass on re-execution. */
export const REVALIDATION_SCENARIOS: Record<string, RevalidationScenario> = {
  'SHOP-T405': 'fail_same',
  'SHOP-T610': 'fail_same',
  'SHOP-T215': 'fail_same',
  'SHOP-T803': ['fail_same', 'pass', 'fail_same'],
  'SHOP-T120': 'mcp_error',
};
