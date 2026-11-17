import type { TestCase, TestCasePriority } from '../../../domain/types';

interface CatalogEntry {
  key: string;
  name: string;
  component: string;
  priority: TestCasePriority;
  businessCritical?: boolean;
  revalidation?: boolean;
  script: string;
}

const CATALOG: CatalogEntry[] = [
  { key: 'SHOP-T101', name: 'Login with valid credentials', component: 'Authentication', priority: 'Critical', businessCritical: true, script: 'tests/auth/login.spec.ts' },
  { key: 'SHOP-T102', name: 'Login rejects invalid password', component: 'Authentication', priority: 'High', script: 'tests/auth/login.spec.ts' },
  { key: 'SHOP-T103', name: 'Account lockout after 5 failed attempts', component: 'Authentication', priority: 'High', script: 'tests/auth/lockout.spec.ts' },
  { key: 'SHOP-T110', name: 'Single sign-on with Google', component: 'Authentication', priority: 'Normal', script: 'tests/auth/sso.spec.ts' },
  { key: 'SHOP-T120', name: 'Password reset link completes reset flow', component: 'Authentication', priority: 'Critical', businessCritical: true, script: 'tests/auth/password-reset.spec.ts' },
  { key: 'SHOP-T130', name: 'Logout clears session', component: 'Authentication', priority: 'Normal', script: 'tests/auth/logout.spec.ts' },
  { key: 'SHOP-T201', name: 'Browse catalog by category', component: 'Catalog', priority: 'High', script: 'tests/catalog/browse.spec.ts' },
  { key: 'SHOP-T202', name: 'Product detail page renders price and stock', component: 'Catalog', priority: 'High', script: 'tests/catalog/product-detail.spec.ts' },
  { key: 'SHOP-T203', name: 'Product image gallery zoom', component: 'Catalog', priority: 'Low', script: 'tests/catalog/gallery.spec.ts' },
  { key: 'SHOP-T204', name: 'Search returns relevant products', component: 'Search', priority: 'High', script: 'tests/search/search.spec.ts' },
  { key: 'SHOP-T205', name: 'Search results pagination', component: 'Search', priority: 'Normal', script: 'tests/search/pagination.spec.ts' },
  { key: 'SHOP-T206', name: 'Search filters by brand and price', component: 'Search', priority: 'Normal', script: 'tests/search/filters.spec.ts' },
  { key: 'SHOP-T215', name: 'Search by SKU returns exact product', component: 'Search', priority: 'Normal', script: 'tests/search/sku.spec.ts' },
  { key: 'SHOP-T216', name: 'Search autocomplete suggestions', component: 'Search', priority: 'Low', script: 'tests/search/autocomplete.spec.ts' },
  { key: 'SHOP-T301', name: 'Apply promo code in cart', component: 'Cart', priority: 'High', script: 'tests/cart/promo.spec.ts' },
  { key: 'SHOP-T302', name: 'Add product to cart', component: 'Cart', priority: 'Critical', businessCritical: true, script: 'tests/cart/add.spec.ts' },
  { key: 'SHOP-T303', name: 'Update cart item quantity', component: 'Cart', priority: 'High', script: 'tests/cart/quantity.spec.ts' },
  { key: 'SHOP-T304', name: 'Remove item from cart', component: 'Cart', priority: 'Normal', script: 'tests/cart/remove.spec.ts' },
  { key: 'SHOP-T305', name: 'Cart persists across sessions', component: 'Cart', priority: 'Normal', script: 'tests/cart/persistence.spec.ts' },
  { key: 'SHOP-T401', name: 'Guest checkout with shipping address', component: 'Checkout', priority: 'Critical', businessCritical: true, script: 'tests/checkout/guest.spec.ts' },
  { key: 'SHOP-T402', name: 'Checkout order total includes tax', component: 'Checkout', priority: 'Critical', businessCritical: true, script: 'tests/checkout/totals.spec.ts' },
  { key: 'SHOP-T403', name: 'Shipping method selection updates total', component: 'Checkout', priority: 'High', script: 'tests/checkout/shipping.spec.ts' },
  { key: 'SHOP-T404', name: 'Checkout address validation', component: 'Checkout', priority: 'High', script: 'tests/checkout/address.spec.ts' },
  { key: 'SHOP-T405', name: 'Place order with saved card', component: 'Payments', priority: 'Critical', businessCritical: true, script: 'tests/payments/saved-card.spec.ts' },
  { key: 'SHOP-T406', name: 'Place order with PayPal', component: 'Payments', priority: 'Critical', businessCritical: true, script: 'tests/payments/paypal.spec.ts' },
  { key: 'SHOP-T407', name: '3-D Secure challenge flow', component: 'Payments', priority: 'High', script: 'tests/payments/3ds.spec.ts' },
  { key: 'SHOP-T408', name: 'Declined card shows error', component: 'Payments', priority: 'High', script: 'tests/payments/declined.spec.ts' },
  { key: 'SHOP-T501', name: 'Order confirmation page', component: 'Orders', priority: 'Critical', businessCritical: true, script: 'tests/orders/confirmation.spec.ts' },
  { key: 'SHOP-T502', name: 'Order history lists past orders', component: 'Orders', priority: 'High', script: 'tests/orders/history.spec.ts' },
  { key: 'SHOP-T503', name: 'Cancel order before shipment', component: 'Orders', priority: 'High', script: 'tests/orders/cancel.spec.ts' },
  { key: 'SHOP-T504', name: 'Request return for delivered order', component: 'Orders', priority: 'Normal', script: 'tests/orders/returns.spec.ts' },
  { key: 'SHOP-T512', name: 'Order history filters by status', component: 'Orders', priority: 'Normal', script: 'tests/orders/history-filters.spec.ts' },
  { key: 'SHOP-T601', name: 'Update profile name and phone', component: 'Profile', priority: 'Normal', script: 'tests/profile/details.spec.ts' },
  { key: 'SHOP-T602', name: 'Manage saved addresses', component: 'Profile', priority: 'Normal', script: 'tests/profile/addresses.spec.ts' },
  { key: 'SHOP-T603', name: 'Manage saved payment methods', component: 'Profile', priority: 'High', script: 'tests/profile/payment-methods.spec.ts' },
  { key: 'SHOP-T610', name: 'Upload profile avatar', component: 'Profile', priority: 'Low', script: 'tests/profile/avatar.spec.ts' },
  { key: 'SHOP-T701', name: 'Admin dashboard KPIs load', component: 'Admin', priority: 'Normal', script: 'tests/admin/dashboard.spec.ts' },
  { key: 'SHOP-T702', name: 'Admin exports sales report', component: 'Admin', priority: 'Normal', script: 'tests/admin/export.spec.ts' },
  { key: 'SHOP-T703', name: 'Admin updates product inventory', component: 'Admin', priority: 'High', script: 'tests/admin/inventory.spec.ts' },
  { key: 'SHOP-T801', name: 'Order confirmation email sent', component: 'Notifications', priority: 'High', script: 'tests/notifications/order-email.spec.ts' },
  { key: 'SHOP-T802', name: 'Password reset email sent', component: 'Notifications', priority: 'High', script: 'tests/notifications/reset-email.spec.ts' },
  { key: 'SHOP-T803', name: 'Shipment notification email sent', component: 'Notifications', priority: 'Normal', script: 'tests/notifications/shipment-email.spec.ts' },
  { key: 'SHOP-T901', name: 'Wishlist add and remove', component: 'Wishlist', priority: 'Low', script: 'tests/wishlist/wishlist.spec.ts' },
  { key: 'SHOP-T902', name: 'Product reviews submission', component: 'Reviews', priority: 'Low', script: 'tests/reviews/submit.spec.ts' },
  { key: 'SHOP-T903', name: 'Store locator map search', component: 'Store Locator', priority: 'Low', script: 'tests/stores/locator.spec.ts' },
  { key: 'SHOP-T904', name: 'Newsletter subscription', component: 'Marketing', priority: 'Low', script: 'tests/marketing/newsletter.spec.ts' },
  { key: 'SHOP-T905', name: 'Gift card balance check', component: 'Payments', priority: 'Normal', script: 'tests/payments/gift-card.spec.ts' },
  { key: 'SHOP-T906', name: 'Currency switcher updates prices', component: 'Catalog', priority: 'Normal', script: 'tests/catalog/currency.spec.ts' },
];

/** Test cases whose Playwright MCP re-execution has NOT been approved. */
const REVALIDATION_NOT_APPROVED = new Set(['SHOP-T110', 'SHOP-T903']);

export const TEST_CASES: TestCase[] = CATALOG.map((e) => ({
  key: e.key,
  name: e.name,
  objective: `Verify that ${e.name.charAt(0).toLowerCase()}${e.name.slice(1)} works as specified.`,
  component: e.component,
  priority: e.priority,
  businessCritical: e.businessCritical ?? false,
  steps: [
    { index: 1, action: 'Open the storefront on the target environment and sign in as the standard test user', expected: 'User is signed in' },
    { index: 2, action: `Navigate to the ${e.component} area`, expected: `${e.component} page is displayed` },
    { index: 3, action: `Perform: ${e.name}`, expected: 'Operation completes without errors' },
    { index: 4, action: 'Verify the resulting UI state and backend response', expected: 'State matches the acceptance criteria' },
  ],
  automationScript: e.script,
  playwrightRevalidationApproved: !REVALIDATION_NOT_APPROVED.has(e.key),
  labels: [e.component.toLowerCase().replace(/\s+/g, '-'), ...(e.businessCritical ? ['business-critical'] : [])],
}));
