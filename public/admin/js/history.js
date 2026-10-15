// The collapsible "History" log on each admin card. Loads only when opened.
import { api } from '/js/api.js';
import { el } from '/js/dom.js';
import { formatDate } from '/js/format.js';

const ACTION_LABELS = {
  approved: 'Approved',
  denied: 'Denied',
  removed: 'Removed',
  reverified: 'Reverified',
  renewed: 'Renewed',
  edited: 'Edited',
  edit_requested: 'Asked for changes',
  edit_approved: 'Approved requested changes',
  edit_rejected: 'Rejected requested changes',
  check_in_sent: 'Sent a check-in email',
  report_dismissed: 'Dismissed a report',
};

/** "poster" is the person who posted it, acting through their private link. */
function actorName(actor) {
  return actor === 'poster' ? 'the poster' : actor;
}

function historyEntry(entry) {
  const label = ACTION_LABELS[entry.action] || entry.action;
  return el('li', {}, [
    `${formatDate(entry.createdAt)} · ${label} by ${actorName(entry.actor)}`,
    entry.detail && el('span', { class: 'muted' }, [` — ${entry.detail}`]),
  ]);
}

async function loadInto(list, listingId) {
  list.replaceChildren(el('li', { class: 'muted' }, ['Loading…']));
  try {
    const entries = await api.get(`/api/admin/listings/${listingId}/history`);
    list.replaceChildren(
      ...(entries.length ? entries.map(historyEntry) : [el('li', { class: 'muted' }, ['No admin actions yet.'])]),
    );
  } catch (error) {
    list.replaceChildren(el('li', {}, [`Couldn't load history: ${error.message}`]));
  }
}

export function renderHistory(listingId) {
  const list = el('ol');
  let loaded = false;
  const details = el('details', { class: 'history' }, [el('summary', {}, ['History']), list]);
  details.addEventListener('toggle', () => {
    if (details.open && !loaded) {
      loaded = true;
      loadInto(list, listingId);
    }
  });
  return details;
}
