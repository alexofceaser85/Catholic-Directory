// How long each kind of post stays up. The numbers live in public/js/post-options.js.
import { findPostTypeById } from '../../public/js/post-options.js';

/** Days until a post of this type expires, or null for types that don't expire (businesses). */
export function shelfLifeDays(postTypeId) {
  return findPostTypeById(postTypeId).expiresAfterDays;
}

/** Businesses are rechecked by an admin every so often; other posts simply expire. */
export function isReverifiedType(postTypeId) {
  return shelfLifeDays(postTypeId) === null;
}
