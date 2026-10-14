// Converts database rows (snake_case) into the JSON shapes the browser receives.
// The public shape deliberately leaves out submitter names, notes and status.
import config from '../config.js';
import { findNameMatches } from '../lib/nameCheck.js';

function splitLinks(links) {
  return links ? links.split('\n').filter(Boolean) : [];
}

export function toPublicListing(row) {
  return {
    id: row.id,
    businessName: row.business_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    description: row.description,
    website: row.website,
    links: splitLinks(row.links),
    lastVerifiedAt: row.last_verified_at,
  };
}

export function toAdminListing(row) {
  const daysSinceVerified = row.days_since_verified === null ? null : Number(row.days_since_verified);
  const listing = {
    ...toPublicListing(row),
    status: row.status,
    submitterFirstName: row.submitter_first_name,
    submitterLastName: row.submitter_last_name,
    adminNotes: row.admin_notes,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    daysSinceVerified,
    needsReverification:
      row.status === 'approved' && daysSinceVerified !== null && daysSinceVerified >= config.reverifyAfterDays,
  };
  listing.nameMatches = findNameMatches(listing);
  return listing;
}

export function toReport(row) {
  return { id: row.id, listingId: row.listing_id, reason: row.reason, createdAt: row.created_at };
}

export function toAdminAction(row) {
  return {
    id: row.id,
    adminEmail: row.admin_email,
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
