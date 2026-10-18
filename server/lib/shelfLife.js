// How long each kind of post stays up. Which types expire is in public/js/post-options.js;
// the longest a post can show is MAX_POST_DAYS (config.maxPostDays).
import config from '../config.js';
import { findPostTypeById } from '../../public/js/post-options.js';

/**
 * Days a post shows when it's approved without an end date, or renewed: the length the
 * poster picked (never more than today's maximum), otherwise the maximum.
 * null for types that don't expire (businesses).
 * @param {object} listing  A database row (post_type, duration_days).
 */
export function shelfLifeDays(listing) {
  if (!findPostTypeById(listing.post_type).expires) return null;
  return Math.min(listing.duration_days || config.maxPostDays, config.maxPostDays);
}

/** Businesses are rechecked by an admin every so often; other posts simply expire. */
export function isReverifiedType(postTypeId) {
  return !findPostTypeById(postTypeId).expires;
}
