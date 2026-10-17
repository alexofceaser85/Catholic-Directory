// Converts database rows (snake_case) into the JSON shapes the browser receives.
// The public shape deliberately leaves out submitter names, notes, status and the manage token.
import config from '../config.js';
import { findNameMatches } from '../lib/nameCheck.js';
import { isReverifiedType } from '../lib/shelfLife.js';
import { findPostTypeById } from '../../public/js/post-options.js';

/** Links and photo keys are stored as newline-separated text. */
function splitLines(value) {
  if (Array.isArray(value)) return value;
  return value ? value.split('\n').filter(Boolean) : [];
}

/** A DATETIME as "2026-10-14" (UTC), or '' when empty. */
function toIsoDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export function toPublicListing(row) {
  return {
    id: row.id,
    postType: findPostTypeById(row.post_type).label,
    category: row.category,
    title: row.title,
    email: row.email,
    phone: row.phone,
    address: row.address,
    description: row.description,
    website: row.website,
    links: splitLines(row.links),
    photos: splitLines(row.photos),
    lastVerified: toIsoDate(row.last_verified_at),
    expires: row.expires_on || '',
  };
}

export function toAdminListing(row) {
  const daysSinceVerified = row.days_since_verified === null ? null : Number(row.days_since_verified);
  const isApproved = row.status === 'approved';
  const listing = {
    ...toPublicListing(row),
    status: row.status,
    submitterFirstName: row.submitter_first_name,
    submitterLastName: row.submitter_last_name,
    adminNotes: row.admin_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    daysSinceVerified,
    isExpired: isApproved && Boolean(Number(row.is_expired)),
    needsReverification:
      isApproved && isReverifiedType(row.post_type) && daysSinceVerified !== null &&
      daysSinceVerified >= config.reverifyAfterDays,
  };
  listing.nameMatches = findNameMatches(listing);
  return listing;
}

/**
 * What a poster sees on their "manage your post" page: the public fields plus where the
 * post stands. Never includes admin notes or the name check.
 */
export function toPosterListing(row, pendingEdit) {
  return {
    ...toPublicListing(row),
    status: row.status,
    isExpired: row.status === 'approved' && Boolean(Number(row.is_expired)),
    pendingEdit: pendingEdit ? { submittedAt: pendingEdit.created_at, changes: pendingEdit.changes } : null,
  };
}

/** Field-by-field comparison for the admin "Edit requests" tab. */
export function toEditRequest(editRow, listingRow) {
  const listing = toAdminListing(listingRow);
  const changes = { ...editRow.changes, links: splitLines(editRow.changes.links) };
  return {
    listing,
    edit: {
      id: editRow.id,
      submittedAt: editRow.created_at,
      changes,
      changedFields: changedFields(listing, changes),
    },
  };
}

function asComparable(value) {
  return Array.isArray(value) ? value.join('\n') : (value ?? null);
}

/** Names of the fields in `changes` whose value differs from `current`. */
export function changedFields(current, changes) {
  return Object.keys(changes).filter((field) => asComparable(current[field]) !== asComparable(changes[field]));
}

export function toReport(row) {
  return { id: row.id, listingId: row.listing_id, reason: row.reason, createdAt: row.created_at };
}

export function toHistoryEntry(row) {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

/** Groups open reports under their listing: [{ listing, reports: [...] }]. */
export function groupReportsByListing(reportRows, listingRows) {
  return listingRows.map((listingRow) => ({
    listing: toAdminListing(listingRow),
    reports: reportRows.filter((report) => report.listing_id === listingRow.id).map(toReport),
  }));
}
