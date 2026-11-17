import type { JiraIssue } from '../../../domain/types';

const base = 'https://example.atlassian.net/browse/';

function issue(i: Omit<JiraIssue, 'url' | 'issueType' | 'updated'> & { issueType?: string; updated?: string }): JiraIssue {
  return { issueType: 'Bug', updated: i.created, ...i, url: `${base}${i.key}` };
}

export const JIRA_ISSUES: JiraIssue[] = [
  issue({
    key: 'SHOP-1180',
    summary: 'Search pagination drops one product on page boundaries',
    description: 'When paging through search results, the last item of page 1 is not shown on page 2. Off-by-one in the search offset calculation.',
    status: 'Open', statusCategory: 'To Do', severity: 'Major', priority: 'Medium',
    components: ['Search'], labels: ['search', 'pagination'], affectsVersions: ['2.13.0'], fixVersions: ['2.15.0'],
    linkedTestCases: ['SHOP-T205'], created: '2026-08-02T10:15:00Z', resolutionDate: null,
  }),
  issue({
    key: 'SHOP-1192',
    summary: 'Stacked promo codes are not applied to cart subtotal',
    description: 'Promo code SAVE10 shows as accepted but the cart discount line remains $0.00 when another promotion is already active.',
    status: 'In Progress', statusCategory: 'In Progress', severity: 'Minor', priority: 'Medium',
    components: ['Cart'], labels: ['promotions'], affectsVersions: ['2.13.0'], fixVersions: ['2.14.0'],
    linkedTestCases: ['SHOP-T301'], created: '2026-09-11T08:00:00Z', resolutionDate: null,
  }),
  issue({
    key: 'SHOP-1301',
    summary: 'Checkout order total excludes regional VAT tax for EU shipping addresses',
    description: 'For EU shipping addresses, the checkout order total is calculated without the regional VAT tax. Order total shows the net amount, so customers are undercharged. Regression from tax service refactor.',
    status: 'Open', statusCategory: 'To Do', severity: 'Critical', priority: 'Highest',
    components: ['Checkout'], labels: ['tax', 'regression'], affectsVersions: ['2.14.0'], fixVersions: ['2.14.0'],
    linkedTestCases: [], created: '2026-11-09T16:40:00Z', resolutionDate: null,
  }),
  issue({
    key: 'SHOP-1050',
    summary: 'Logout does not invalidate refresh token',
    description: 'After logout the refresh token can still be used to obtain a new session.',
    status: 'Done', statusCategory: 'Done', severity: 'Critical', priority: 'High',
    components: ['Authentication'], labels: ['security'], affectsVersions: ['2.12.0'], fixVersions: ['2.12.1'],
    linkedTestCases: ['SHOP-T130'], created: '2026-05-20T09:00:00Z', resolutionDate: '2026-06-02T12:00:00Z',
  }),
  issue({
    key: 'SHOP-1244',
    summary: 'Admin inventory grid slow to render with 10k SKUs',
    description: 'Performance issue in admin inventory grid rendering large catalogs.',
    status: 'Open', statusCategory: 'To Do', severity: 'Minor', priority: 'Low',
    components: ['Admin'], labels: ['performance'], affectsVersions: ['2.13.0'], fixVersions: [],
    linkedTestCases: [], created: '2026-10-01T09:00:00Z', resolutionDate: null,
  }),
  issue({
    key: 'SHOP-1275',
    summary: 'Wishlist icon misaligned on mobile Safari',
    description: 'Cosmetic alignment issue of wishlist heart icon on product cards on iOS Safari.',
    status: 'Open', statusCategory: 'To Do', severity: 'Trivial', priority: 'Lowest',
    components: ['Wishlist'], labels: ['ui'], affectsVersions: ['2.13.0'], fixVersions: [],
    linkedTestCases: [], created: '2026-10-20T09:00:00Z', resolutionDate: null,
  }),
];
