// How long each kind of post stays up. The numbers live in public/js/post-options.js.
import { chosenDuration, findPostTypeById } from '../../public/js/post-options.js';

/**
 * Days until a post expires: the poster's choice if they made a valid one, otherwise the
 * post type's default. null for types that don't expire (businesses).
 * @param {object} listing  A database row (post_type, duration_days).
 */
export function shelfLifeDays(listing) {
  return chosenDuration(findPostTypeById(listing.post_type), listing.duration_days);
}

/** Businesses are rechecked by an admin every so often; other posts simply expire. */
export function isReverifiedType(postTypeId) {
  return findPostTypeById(postTypeId).expiresAfterDays === null;
}
