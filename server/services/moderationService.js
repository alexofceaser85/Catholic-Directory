// The admin workflow. Each exported function is one button on the admin dashboard.
//
//   pending ──approve──▶ approved ──remove──▶ removed
//      │                   │  ▲                  │
//      └──deny──▶ denied   └──┘ reverify         │
//                   │                            │
//                   └──────── approve ◀──────────┘  (restore)
//
// Every action is written to the admin_actions audit trail.
import * as listings from '../repositories/listingRepository.js';
import * as reports from '../repositories/reportRepository.js';
import * as adminActions from '../repositories/adminActionRepository.js';
import { toAdminListing } from '../presenters/listingPresenter.js';
import { HttpError, notFound } from '../lib/httpError.js';

// Which statuses each action may start from.
const ALLOWED_FROM = {
  approve: ['pending', 'denied', 'removed'],
  deny: ['pending'],
  remove: ['pending', 'approved'],
  reverify: ['approved'],
};

const PAST_TENSE = { approve: 'approved', deny: 'denied', remove: 'removed', reverify: 'reverified' };

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
  await loadListingFor('approve', id);
  await listings.updateStatus(id, 'approved');
  await adminActions.insert(id, adminEmail, 'approved', note);
}

export async function deny(id, adminEmail, note) {
  await loadListingFor('deny', id);
  await listings.updateStatus(id, 'denied');
  await adminActions.insert(id, adminEmail, 'denied', note);
}

/** Takes a listing off the directory and closes any reports about it. */
export async function remove(id, adminEmail, note) {
  await loadListingFor('remove', id);
  await listings.updateStatus(id, 'removed');
  await reports.resolveAllForListing(id, 'removed', adminEmail);
  await adminActions.insert(id, adminEmail, 'removed', note);
}

/** The owner confirmed the details are current: reset the counter and close reports. */
export async function reverify(id, adminEmail, note) {
  await loadListingFor('reverify', id);
  await listings.markVerified(id);
  await reports.resolveAllForListing(id, 'reverified', adminEmail);
  await adminActions.insert(id, adminEmail, 'reverified', note);
}

function asComparable(value) {
  return Array.isArray(value) ? value.join('\n') : (value ?? null);
}

function changedFields(current, changes) {
  return Object.keys(changes).filter((field) => asComparable(current[field]) !== asComparable(changes[field]));
}

/** Saves admin edits. The audit entry lists which fields actually changed. */
export async function edit(id, adminEmail, changes) {
  const row = await listings.findById(id);
  if (!row) throw notFound();

  const changed = changedFields(toAdminListing(row), changes);
  if (changed.length === 0) return;

  await listings.update(id, changes);
  await adminActions.insert(id, adminEmail, 'edited', `Changed: ${changed.join(', ')}`);
}

/** Closes a report without changing the listing (e.g. the report was wrong). */
export async function dismissReport(reportId, adminEmail) {
  const report = await reports.findById(reportId);
  if (!report || report.status !== 'open') throw notFound('Open report');
  await reports.resolve(reportId, 'dismissed', adminEmail);
  await adminActions.insert(report.listing_id, adminEmail, 'report_dismissed', report.reason.slice(0, 200));
}
