// The action buttons on an admin card. Which buttons appear depends on the listing's status,
// mirroring the server's rules in server/services/moderationService.js.
import { api } from '/js/api.js';
import { el } from '/js/dom.js';
import { confirmAction } from './action-dialog.js';
import { openEditDialog } from './edit-dialog.js';
import { contactButton } from './contact.js';
import { notify } from './notify.js';

const ACTIONS = {
  approve: {
    label: (listing) => (listing.status === 'pending' ? 'Approve' : 'Restore & approve'),
    heading: (listing) => `Approve ${listing.businessName}?`,
    text: 'It will appear on the public directory right away, and its verification counter starts at 0 days.',
  },
  deny: {
    label: () => 'Deny',
    heading: (listing) => `Deny ${listing.businessName}?`,
    text: "It won't be published. You can still approve it later from the Denied tab.",
    danger: true,
  },
  remove: {
    label: () => 'Remove',
    heading: (listing) => `Remove ${listing.businessName}?`,
    text: 'It will disappear from the public directory and any open reports will be closed. You can restore it later.',
    danger: true,
  },
  reverify: {
    label: () => 'Mark reverified',
    heading: (listing) => `Reverify ${listing.businessName}?`,
    text: 'Confirm the business told you its details are current. The counter resets to 0 days and open reports are closed.',
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
    text: action.text,
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

function actionButton(name, listing, onChange) {
  const action = ACTIONS[name];
  const kind = action.danger ? 'button secondary small' : 'button small';
  return el('button', { type: 'button', class: kind, onclick: () => runAction(name, listing, onChange) }, [
    action.label(listing),
  ]);
}

/** Buttons for one card. Shows "Email business" when the listing needs a check-in. */
export function renderActions(listing, { hasReports, onChange }) {
  const needsCheckIn = listing.status === 'approved' && (listing.needsReverification || hasReports);
  return el('div', { class: 'card-actions' }, [
    needsCheckIn && contactButton(listing),
    ...ACTIONS_BY_STATUS[listing.status].map((name) => actionButton(name, listing, onChange)),
    el('button', { type: 'button', class: 'button secondary small', onclick: () => runEdit(listing, onChange) }, ['Edit']),
  ]);
}
