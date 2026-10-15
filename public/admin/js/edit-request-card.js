// A card on the "Edit requests" tab: a poster asked to change their live post.
// Shows each changed field as "now" vs "requested", with Approve / Reject buttons.
import { api } from '/js/api.js';
import { el } from '/js/dom.js';
import { formatDate } from '/js/format.js';
import { confirmAction } from './action-dialog.js';
import { renderHistory } from './history.js';
import { notify } from './notify.js';

const FIELD_LABELS = {
  title: 'Title',
  category: 'Category',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  description: 'Description',
  website: 'Website',
  links: 'Links',
};

function asText(value) {
  const text = Array.isArray(value) ? value.join('\n') : value;
  return text || '(empty)';
}

function changeRow(field, listing, changes) {
  return el('tr', {}, [
    el('th', { scope: 'row' }, [FIELD_LABELS[field] || field]),
    el('td', { class: 'old-value' }, [asText(listing[field])]),
    el('td', { class: 'new-value' }, [asText(changes[field])]),
  ]);
}

function changesTable(listing, edit) {
  if (edit.changedFields.length === 0) return el('p', { class: 'muted' }, ['The poster re-sent the post without changing anything.']);
  return el('table', { class: 'diff-table' }, [
    el('thead', {}, [el('tr', {}, [el('th', {}, ['Field']), el('th', {}, ['Now']), el('th', {}, ['Requested'])])]),
    el('tbody', {}, edit.changedFields.map((field) => changeRow(field, listing, edit.changes))),
  ]);
}

async function review(edit, decision, onChange) {
  const approve = decision === 'approve';
  const choice = await confirmAction({
    heading: approve ? 'Approve these changes?' : 'Reject these changes?',
    text: approve
      ? 'The live listing updates right away.'
      : 'The live listing stays as it is. Consider adding a note, then let the poster know why.',
    confirmLabel: approve ? 'Approve changes' : 'Reject changes',
    danger: !approve,
  });
  if (!choice) return;
  try {
    await api.post(`/api/admin/edits/${edit.id}/${decision}`, { note: choice.note });
    onChange();
  } catch (error) {
    notify(error.message, 'error');
  }
}

/** Warns when the requested text contains the submitter's name, like the check on new posts. */
function nameWarning(listing, edit) {
  const names = [listing.submitterFirstName, listing.submitterLastName].filter((name) => name && name.length >= 2);
  const text = Object.values(edit.changes).flat().join(' ').toLowerCase();
  const found = names.filter((name) => new RegExp(`\\b${name.toLowerCase().replace(/[^a-z0-9]/g, '')}\\b`).test(text));
  if (found.length === 0) return null;
  return el('div', { class: 'callout warning', role: 'note' }, ["⚠ The requested changes contain the submitter's name. Reject, or approve and then edit it out."]);
}

/** @param {{ listing: object, edit: object }} item  From GET /api/admin/edits. */
export function renderEditRequestCard({ listing, edit }, onChange) {
  return el('li', { class: 'card admin-card' }, [
    el('div', { class: 'admin-card-header' }, [
      el('div', {}, [
        el('p', { class: 'card-tags' }, [el('span', { class: 'badge neutral' }, [listing.postType]), listing.category]),
        el('h2', { class: 'card-title' }, [listing.title]),
      ]),
      el('span', { class: 'badge warning' }, [`Requested ${formatDate(edit.submittedAt)}`]),
    ]),
    el('div', { class: 'callout private' }, [
      el('span', { class: 'badge private' }, ['Private']),
      ` Posted by ${listing.submitterFirstName} ${listing.submitterLastName}`,
    ]),
    nameWarning(listing, edit),
    changesTable(listing, edit),
    el('div', { class: 'card-actions' }, [
      el('button', { type: 'button', class: 'button small', onclick: () => review(edit, 'approve', onChange) }, ['Approve changes']),
      el('button', { type: 'button', class: 'button secondary small', onclick: () => review(edit, 'reject', onChange) }, ['Reject changes']),
    ]),
    renderHistory(listing.id),
  ]);
}
