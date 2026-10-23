// What the public (no account) can do: browse, post, and report outdated info.
import * as listings from '../repositories/listingRepository.js';
import * as reports from '../repositories/reportRepository.js';
import { toPublicListing } from '../presenters/listingPresenter.js';
import { createManageToken } from '../lib/manageToken.js';
import { sendWelcomeEmail } from './posterEmails.js';
import { preparePhotos, savePhotos } from './photoService.js';
import { HttpError, notFound } from '../lib/httpError.js';
import config from '../config.js';

export async function getPublicListings() {
  const rows = await listings.findLive();
  return rows.map(toPublicListing);
}

/**
 * Saves a new post. It stays hidden (status "pending") until an admin approves it.
 * The poster gets an email with their private link for editing, renewing or removing it.
 */
export async function submitListing(fields) {
  await checkPostingLimit(fields.email);
  const prepared = await preparePhotos(fields);
  const { token, hash } = createManageToken();
  const { photos, ...details } = prepared;
  const id = await listings.insert({ ...details, manageTokenHash: hash });
  if (photos?.length) await listings.update(id, await savePhotos(id, { photos }));
  await sendWelcomeEmail(fields, token);
}

/** One post per email address per POSTER_EMAIL_LIMIT_HOURS, since each post sends an email. */
async function checkPostingLimit(email) {
  const hours = config.posterEmailLimitHours;
  if (hours > 0 && await listings.hasSubmittedSince(email, hours)) {
    throw new HttpError(429, `This email address already sent a post in the last ${hours} hours. Please try again later.`);
  }
}

/** Only live listings can be reported. */
export async function reportListing(listingId, reason) {
  const listing = await listings.findLiveById(listingId);
  if (!listing) throw notFound();
  await reports.insert(listingId, reason);
}
