// What the public (no account) can do: browse, ask to be added, report outdated info.
import * as listings from '../repositories/listingRepository.js';
import * as reports from '../repositories/reportRepository.js';
import { toPublicListing } from '../presenters/listingPresenter.js';
import { notFound } from '../lib/httpError.js';

export async function getPublicListings() {
  const rows = await listings.findApproved();
  return rows.map(toPublicListing);
}

/** Saves a new request. It stays hidden (status "pending") until an admin approves it. */
export function submitListing(fields) {
  return listings.insert(fields);
}

/** Only live listings can be reported. */
export async function reportListing(listingId, reason) {
  const listing = await listings.findPublicById(listingId);
  if (!listing) throw notFound();
  await reports.insert(listingId, reason);
}
