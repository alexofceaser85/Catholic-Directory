// What a poster can do with their private "manage your post" link. No account needed:
// the secret token in the link is the proof that the post is theirs.
//
//   pending  ── edit ──▶ pending (changes saved right away; it hasn't been reviewed yet)
//   approved ── edit ──▶ approved + a pending edit (live version stays up until an admin approves it)
//   approved ── renew ─▶ approved (businesses: "still current"; other posts: expiry pushed out)
//   pending / approved ── remove ──▶ removed
import * as listings from '../repositories/listingRepository.js';
import * as edits from '../repositories/listingEditRepository.js';
import * as reports from '../repositories/reportRepository.js';
import * as history from '../repositories/historyRepository.js';
import { toPosterListing } from '../presenters/listingPresenter.js';
import { createManageToken, hashManageToken } from '../lib/manageToken.js';
import { shelfLifeDays, isReverifiedType } from '../lib/shelfLife.js';
import { sendLinksEmail } from './posterEmails.js';
import { preparePhotos, savePhotos, pruneUnusedPhotos } from './photoService.js';
import { LINK_NOT_VALID } from '../validation/listingValidation.js';
import { HttpError } from '../lib/httpError.js';
import config from '../config.js';

const MANAGEABLE = ['pending', 'approved'];

/** The listing behind a token. Denied posts and unknown tokens look the same: "link doesn't work". */
async function loadOwnListing(token) {
  const row = await listings.findByManageTokenHash(hashManageToken(token));
  if (!row || row.status === 'denied') throw new HttpError(404, LINK_NOT_VALID);
  return row;
}

function requireStatus(row, allowed, message) {
  if (!allowed.includes(row.status)) throw new HttpError(409, message);
}

export async function getOwnPost(token) {
  const row = await loadOwnListing(token);
  return toPosterListing(row, await edits.findPendingForListing(row.id));
}

/**
 * Not yet reviewed: the changes apply right away. Already live: they wait for an admin,
 * and the live version stays up meanwhile. Returns { needsReview }.
 */
export async function editOwnPost(token, requested) {
  const row = await loadOwnListing(token);
  requireStatus(row, MANAGEABLE, 'This post has been removed, so it can no longer be edited.');
  const changes = await savePhotos(row.id, await preparePhotos(requested));

  const needsReview = row.status === 'approved';
  if (needsReview) {
    await edits.replacePending(row.id, changes);
    await history.insert(row.id, history.POSTER, 'edit_requested');
  } else {
    await listings.update(row.id, changes);
    await history.insert(row.id, history.POSTER, 'edited', 'Before review');
  }
  await pruneUnusedPhotos(row.id);
  return { needsReview };
}

/** Businesses: "my details are still right". Other posts: show it for another full shelf life. */
export async function renewOwnPost(token) {
  const row = await loadOwnListing(token);
  requireStatus(row, ['approved'], 'Only approved posts can be renewed.');

  await listings.restartShelfLife(row.id, shelfLifeDays(row));
  await history.insert(row.id, history.POSTER, isReverifiedType(row.post_type) ? 'reverified' : 'renewed');
}

export async function removeOwnPost(token) {
  const row = await loadOwnListing(token);
  requireStatus(row, MANAGEABLE, 'This post was already removed.');

  await listings.updateStatus(row.id, 'removed');
  await edits.discardPendingForListing(row.id);
  await pruneUnusedPhotos(row.id);
  await reports.resolveAllForListing(row.id, 'removed', history.POSTER);
  await history.insert(row.id, history.POSTER, 'removed');
}

/**
 * "I lost my link": emails a fresh link for every post with this contact email.
 * New tokens replace the old ones (only hashes are stored, so old links can't be re-sent).
 * Callers always answer the same way, so this can't be used to find out who has posted.
 * Sent at most once per POSTER_EMAIL_LIMIT_HOURS per email. Returns true when a recent
 * email already went out, so the page can point the poster back to their inbox.
 */
export async function sendFreshLinks(email) {
  const hours = config.posterEmailLimitHours;
  if (hours > 0 && await listings.hasLinksEmailedSince(email, hours)) return true;
  const rows = await listings.findManageableByEmail(email);
  if (rows.length === 0) return false;

  const posts = [];
  for (const row of rows) {
    const { token, hash } = createManageToken();
    await listings.setManageTokenHash(row.id, hash);
    posts.push({ post: row, token });
  }
  await listings.markLinksEmailed(email);
  await sendLinksEmail(email, posts);
  return false;
}
