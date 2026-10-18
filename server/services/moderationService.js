// The admin workflow. Each exported function is one button on the admin dashboard.
//
//   pending ──approve──▶ approved ──remove──▶ removed
//      │                   │  ▲                  │
//      └──deny──▶ denied   └──┘ reverify/renew   │
//                   │                            │
//                   └──────── approve ◀──────────┘  (restore)
//
// Approving starts the post's shelf life and reverifying or renewing restarts it (lib/shelfLife.js).
// Every action is written to the listing_history table.
import * as listings from '../repositories/listingRepository.js';
import * as edits from '../repositories/listingEditRepository.js';
import * as reports from '../repositories/reportRepository.js';
import * as history from '../repositories/historyRepository.js';
import { toAdminListing, changedFields } from '../presenters/listingPresenter.js';
import { createManageToken } from '../lib/manageToken.js';
import { shelfLifeDays, isReverifiedType } from '../lib/shelfLife.js';
import { sendCheckInEmail } from './posterEmails.js';
import { preparePhotos, savePhotos, pruneUnusedPhotos } from './photoService.js';
import { HttpError, notFound } from '../lib/httpError.js';

// Which statuses each action may start from.
const ALLOWED_FROM = {
  approve: ['pending', 'denied', 'removed'],
  deny: ['pending'],
  remove: ['pending', 'approved'],
  reverify: ['approved'],
  checkIn: ['approved'],
};

const PAST_TENSE = {
  approve: 'approved', deny: 'denied', remove: 'removed', reverify: 'reverified', checkIn: 'sent a check-in',
};

async function loadListingFor(action, id) {
  const listing = await listings.findById(id);
  if (!listing) throw notFound();
  if (!ALLOWED_FROM[action].includes(listing.status)) {
    throw new HttpError(
      409,
      `This listing is ${listing.status}, so it can't be ${PAST_TENSE[action]}. Refresh to see its latest state.`,
    );
  }
  return listing;
}

export async function approve(id, adminEmail, note) {
  const listing = await loadListingFor('approve', id);
  await listings.updateStatus(id, 'approved');
  await listings.startShelfLife(id, shelfLifeDays(listing));
  await history.insert(id, adminEmail, 'approved', note);
}

export async function deny(id, adminEmail, note) {
  await loadListingFor('deny', id);
  await listings.updateStatus(id, 'denied');
  await history.insert(id, adminEmail, 'denied', note);
}

/** Takes a listing off the directory and closes any reports and edit requests about it. */
export async function remove(id, adminEmail, note) {
  await loadListingFor('remove', id);
  await listings.updateStatus(id, 'removed');
  await edits.discardPendingForListing(id);
  await pruneUnusedPhotos(id);
  await reports.resolveAllForListing(id, 'removed', adminEmail);
  await history.insert(id, adminEmail, 'removed', note);
}

/**
 * Businesses: the owner confirmed the details are current (counter back to 0 days).
 * Other posts: renew, i.e. show it for another full shelf life. Either way, open reports close.
 */
export async function reverify(id, adminEmail, note) {
  const listing = await loadListingFor('reverify', id);
  await listings.restartShelfLife(id, shelfLifeDays(listing));
  await reports.resolveAllForListing(id, 'reverified', adminEmail);
  await history.insert(id, adminEmail, isReverifiedType(listing.post_type) ? 'reverified' : 'renewed', note);
}

/** Emails the poster a fresh private link asking them to confirm, renew, edit or remove the post. */
export async function sendCheckIn(id, adminEmail) {
  const listing = await loadListingFor('checkIn', id);
  const { token, hash } = createManageToken();
  await listings.setManageTokenHash(id, hash);
  await sendCheckInEmail({ title: listing.title, email: listing.email, postType: listing.post_type }, token);
  await history.insert(id, adminEmail, 'check_in_sent', `Emailed ${listing.email}`);
}

/** Saves admin edits. The history entry lists which fields actually changed. */
export async function edit(id, adminEmail, requested) {
  const row = await listings.findById(id);
  if (!row) throw notFound();
  const changes = await savePhotos(id, await preparePhotos(requested));

  const current = { ...toAdminListing(row), postType: row.post_type };
  const changed = changedFields(current, changes);
  if (changed.length === 0) return;

  await listings.update(id, changes);
  await pruneUnusedPhotos(id);
  await history.insert(id, adminEmail, 'edited', `Changed: ${changed.join(', ')}`);
}

async function loadPendingEdit(editId) {
  const edit = await edits.findById(editId);
  if (!edit || edit.status !== 'pending') throw notFound('Pending edit');
  return edit;
}

/** Applies a poster's requested changes to the live listing. */
export async function approveEdit(editId, adminEmail, note) {
  const edit = await loadPendingEdit(editId);
  await listings.update(edit.listing_id, edit.changes);
  await edits.markReviewed(editId, 'approved', adminEmail);
  await pruneUnusedPhotos(edit.listing_id);
  await history.insert(edit.listing_id, adminEmail, 'edit_approved', note);
}

/** Keeps the live listing as it is. */
export async function rejectEdit(editId, adminEmail, note) {
  const edit = await loadPendingEdit(editId);
  await edits.markReviewed(editId, 'rejected', adminEmail);
  await pruneUnusedPhotos(edit.listing_id); // drops photos that were only in the rejected edit
  await history.insert(edit.listing_id, adminEmail, 'edit_rejected', note);
}

/** Closes a report without changing the listing (e.g. the report was wrong). */
export async function dismissReport(reportId, adminEmail) {
  const report = await reports.findById(reportId);
  if (!report || report.status !== 'open') throw notFound('Open report');
  await reports.resolve(reportId, 'dismissed', adminEmail);
  await history.insert(report.listing_id, adminEmail, 'report_dismissed', report.reason.slice(0, 200));
}
