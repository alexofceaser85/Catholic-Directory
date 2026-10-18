// The action buttons on an admin card. Which buttons appear depends on the listing's status,
// mirroring the server's rules in server/services/moderationService.js.
import { api } from '/js/api.js';
import { el } from '/js/dom.js';
import { formatDate } from '/js/format.js';
import { findPostType, isoDate } from '/js/post-options.js';
import { confirmAction } from './action-dialog.js';
import { openEditDialog } from './edit-dialog.js';
import { notify } from './notify.js';

const isBusiness = (listing) => !findPostType(listing.postType).expires;
const shelfLife = (listing) => listing.renewDays;

/** Approval keeps an end date that's still ahead (picked by the poster or an admin). */
function approvalLength(listing) {
  return listing.expires && listing.expires >= isoDate(new Date())
    ? `until ${formatDate(listing.expires)}`
    : `for ${shelfLife(listing)} days`;
}

const ACTIONS = {
  approve: {
    label: (listing) => (listing.status === 'pending' ? 'Approve' : 'Restore & approve'),
    heading: (listing) => `Approve ${listing.title}?`,
    text: (listing) =>
      isBusiness(listing)
        ? 'It will appear on the public directory right away, and its check-in counter starts at 0 days.'
        : `It will appear on the public directory right away and show ${approvalLength(listing)}.`,
  },
  deny: {
    label: () => 'Deny',
    heading: (listing) => `Deny ${listing.title}?`,
    text: () => "It won't be published. You can still approve it later from the Denied tab.",
    danger: true,
  },
  remove: {
    label: () => 'Remove',
    heading: (listing) => `Remove ${listing.title}?`,
    text: () => 'It will disappear from the public directory and any open reports will be closed. You can restore it later.',
    danger: true,
  },
  reverify: {
    label: (listing) => (isBusiness(listing) ? 'Mark still current' : `Renew ${shelfLife(listing)} days`),
    heading: (listing) => (isBusiness(listing) ? `Mark ${listing.title} still current?` : `Renew ${listing.title}?`),
    text: (listing) =>
      isBusiness(listing)
        ? 'Only do this once the business has told you its details are still right. The counter resets to 0 days and open reports are closed.'
        : `It will show for another ${shelfLife(listing)} days from today. Open reports are closed.`,
  },
  'check-in': {
    label: () => '✉ Email poster',
    heading: (listing) => `Email ${listing.email}?`,
    text: (listing) =>
      (isBusiness(listing)
        ? 'They get a private link to confirm the listing is current, edit it, or remove it.'
        : 'They get a private link to renew the post or remove it.') +
      ' Their old link stops working. You will see what they do in the history log.',
  },
};

const ACTIONS_BY_STATUS = {
  pending: ['approve', 'deny'],
  approved: ['reverify', 'remove'],
  denied: ['approve'],
  removed: ['approve'],
};

async function runAction(name, listing, onChange) {
  const action = ACTIONS[name];
  const choice = await confirmAction({
    heading: action.heading(listing),
    text: action.text(listing),
    confirmLabel: action.label(listing),
    danger: action.danger,
  });
  if (!choice) return;

  try {
    await api.post(`/api/admin/listings/${listing.id}/${name}`, { note: choice.note });
    onChange();
  } catch (error) {
    notify(error.message, 'error');
  }
}

async function runEdit(listing, onChange) {
  if (await openEditDialog(listing)) onChange();
}

function actionButton(name, listing, onChange, kind = ACTIONS[name].danger ? 'button secondary small' : 'button small') {
  return el('button', { type: 'button', class: kind, onclick: () => runAction(name, listing, onChange) }, [
    ACTIONS[name].label(listing),
  ]);
}

/** Buttons for one card. Offers "Email poster" when a live listing needs a check-in. */
export function renderActions(listing, { hasReports, onChange }) {
  const needsCheckIn =
    listing.status === 'approved' && (listing.needsReverification || listing.isExpired || hasReports);
  return el('div', { class: 'card-actions' }, [
    needsCheckIn && actionButton('check-in', listing, onChange, 'button secondary small'),
    ...ACTIONS_BY_STATUS[listing.status].map((name) => actionButton(name, listing, onChange)),
    el('button', { type: 'button', class: 'button secondary small', onclick: () => runEdit(listing, onChange) }, ['Edit']),
  ]);
}
