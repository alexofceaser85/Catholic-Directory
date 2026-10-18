// The dashboard tabs. Each tab is one queue in the workflow.
//   countKey    -> which number from GET /api/admin/summary goes in the tab badge
//   url         -> where the tab's items come from
//   kind        -> what each item is: 'listing' (default), 'reports' ({ listing, reports })
//                  or 'edit' ({ listing, edit })
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
    id: 'edits',
    label: 'Edit requests',
    countKey: 'editRequests',
    needsAction: true,
    kind: 'edit',
    url: '/api/admin/edits',
    description: () =>
      'Posters asked to change their live posts. The live version stays up until you approve. Check for personal names first.',
    empty: 'No edit requests.',
  },
  {
    id: 'reverify',
    label: 'Due for check-in',
    countKey: 'needsReverification',
    needsAction: true,
    url: '/api/admin/listings/needs-reverification',
    description: (summary) =>
      `Businesses not confirmed in ${summary.reverifyAfterDays}+ days. "Email poster" sends them a private link to ` +
      'confirm, edit or remove it themselves. Or contact them and mark it still current (resets the counter to 0).',
    empty: 'Every live business has been confirmed recently.',
  },
  {
    id: 'expired',
    label: 'Expired',
    countKey: 'expired',
    url: '/api/admin/listings/expired',
    description: () =>
      'Services and help-wanted posts past their shelf life. They are already hidden from the directory. ' +
      'Nothing to do unless the poster wants it back (Renew); remove them to tidy up.',
    empty: 'No expired posts.',
  },
  {
    id: 'reports',
    label: 'Reports',
    countKey: 'openReports',
    needsAction: true,
    kind: 'reports',
    url: '/api/admin/reports',
    description: () =>
      'Visitors flagged these listings as out of date. Email the poster, then mark it current or renew it, edit, remove, or dismiss the report.',
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
