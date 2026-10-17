// Builds one listing card on the admin dashboard: every detail an admin needs
// to make a decision, plus the action buttons and the history log.
import { el, externalLink } from '/js/dom.js';
import { formatDate, plural } from '/js/format.js';
import { renderPhotoStrip } from '/js/photo-strip.js';
import { renderActions } from './card-actions.js';
import { renderReports } from './reports.js';
import { renderHistory } from './history.js';

const STATUS_BADGES = {
  pending: ['Pending', 'warning'],
  approved: ['Live', 'success'],
  denied: ['Denied', 'danger'],
  removed: ['Removed', 'neutral'],
};

/** Businesses: days since verified. Other posts: when they expire (or that they have). */
function freshnessBadge(listing) {
  if (listing.status !== 'approved') return null;
  if (listing.isExpired) return el('span', { class: 'badge danger' }, [`Expired ${formatDate(listing.expires)}`]);
  if (listing.expires) return el('span', { class: 'badge neutral' }, [`Shows until ${formatDate(listing.expires)}`]);
  return verificationBadge(listing);
}

function verificationBadge(listing) {
  if (listing.daysSinceVerified === null) return null;
  const kind = listing.needsReverification ? 'danger' : 'neutral';
  const days = listing.daysSinceVerified;
  const text = days === 0 ? 'Verified today' : `Verified ${plural(days, 'day')} ago`;
  return el('span', { class: `badge ${kind}` }, [text]);
}

function cardHeader(listing) {
  const [statusLabel, statusKind] = STATUS_BADGES[listing.status];
  return el('div', { class: 'admin-card-header' }, [
    el('div', {}, [
      el('p', { class: 'card-tags' }, [el('span', { class: 'badge neutral' }, [listing.postType]), listing.category]),
      el('h2', { class: 'card-title' }, [listing.title]),
    ]),
    el('div', { class: 'badges' }, [
      el('span', { class: `badge ${statusKind}` }, [statusLabel]),
      freshnessBadge(listing),
    ]),
  ]);
}

function submitterSection(listing) {
  return el('div', { class: 'callout private' }, [
    el('span', { class: 'badge private' }, ['Private']),
    ` Submitted by ${listing.submitterFirstName} ${listing.submitterLastName} on ${formatDate(listing.submittedAt)}`,
  ]);
}

function nameWarning(listing) {
  if (listing.nameMatches.length === 0) return null;
  return el('div', { class: 'callout warning', role: 'note' }, [
    `⚠ The submitter's name appears in: ${listing.nameMatches.join(', ')}. Edit it out before approving.`,
  ]);
}

function detailRow(label, value) {
  if (!value || (Array.isArray(value) && value.length === 0)) return [];
  return [el('dt', {}, [label]), el('dd', {}, [value])];
}

function detailsList(listing) {
  const links = listing.links.length
    ? el('ul', { class: 'link-list' }, listing.links.map((url) => el('li', {}, [externalLink(url)])))
    : null;

  return el('dl', { class: 'detail-grid' }, [
    ...detailRow('Email', el('a', { href: `mailto:${listing.email}` }, [listing.email])),
    ...detailRow('Phone', listing.phone),
    ...detailRow('Address', listing.address),
    ...detailRow('Description', listing.description),
    ...detailRow('Website', listing.website && externalLink(listing.website)),
    ...detailRow('Links', links),
    ...detailRow('Photos', renderPhotoStrip(listing.photos, listing.title)),
    ...detailRow('Last verified', listing.lastVerified && formatDate(listing.lastVerified)),
    ...detailRow('Expires', listing.expires && formatDate(listing.expires)),
  ]);
}

function adminNotes(listing) {
  if (!listing.adminNotes) return null;
  return el('div', { class: 'callout private' }, [el('strong', {}, ['Admin notes: ']), listing.adminNotes]);
}

/**
 * @param {object} listing Admin listing from the API.
 * @param {{ reports?: object[], onChange: () => void }} options
 *   reports  - open reports to show (Reports tab only)
 *   onChange - called after any action so the dashboard can reload
 */
export function renderAdminCard(listing, { reports = [], onChange }) {
  return el('li', { class: 'card admin-card' }, [
    cardHeader(listing),
    submitterSection(listing),
    nameWarning(listing),
    renderReports(reports, onChange),
    detailsList(listing),
    adminNotes(listing),
    renderActions(listing, { hasReports: reports.length > 0, onChange }),
    renderHistory(listing.id),
  ]);
}
