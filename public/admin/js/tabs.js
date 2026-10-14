// The dashboard tabs. Each tab is one queue in the workflow.
//   countKey    -> which number from GET /api/admin/summary goes in the tab badge
//   url         -> where the tab's items come from
//   grouped     -> items are { listing, reports } (Reports tab) instead of plain listings
//   needsAction -> highlight the badge when the count is above zero

export const TABS = [
  {
    id: 'pending',
    label: 'Pending review',
    countKey: 'pending',
    needsAction: true,
    url: '/api/admin/listings?status=pending',
    description: () => 'New requests. Check the name warning, edit if needed, then approve or deny.',
    empty: 'No requests are waiting for review.',
  },
  {
    id: 'reverify',
    label: 'Needs reverification',
    countKey: 'needsReverification',
    needsAction: true,
    url: '/api/admin/listings/needs-reverification',
    description: (summary) =>
      `Live listings not verified in ${summary.reverifyAfterDays}+ days. Contact the business through its public ` +
      'email or phone. If the details are still right, mark it reverified (resets the counter to 0). Otherwise edit or remove it.',
    empty: 'Every live listing has been verified recently.',
  },
  {
    id: 'reports',
    label: 'Reports',
    countKey: 'openReports',
    needsAction: true,
    grouped: true,
    url: '/api/admin/reports',
    description: () =>
      'Visitors flagged these listings as out of date. Contact the business, then reverify, edit, remove, or dismiss the report.',
    empty: 'No open reports.',
  },
  {
    id: 'approved',
    label: 'Live',
    countKey: 'approved',
    url: '/api/admin/listings?status=approved',
    description: () => 'Everything currently shown on the public directory.',
    empty: 'Nothing is live yet.',
  },
  {
    id: 'denied',
    label: 'Denied',
    countKey: 'denied',
    url: '/api/admin/listings?status=denied',
    description: () => 'Requests that were turned down. They can still be approved later.',
    empty: 'No denied requests.',
  },
  {
    id: 'removed',
    label: 'Removed',
    countKey: 'removed',
    url: '/api/admin/listings?status=removed',
    description: () => 'Listings taken down after being live. They can be restored.',
    empty: 'No removed listings.',
  },
];
