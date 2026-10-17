// Saving and cleaning up a post's photos.
//
// Forms send an ordered list of photos, each either { keep: key } (already saved) or
// { upload: Buffer } (new). Saving turns that into an ordered list of keys, which is stored
// like any other field. So a poster's photo change on a live post waits in their pending
// edit until an admin approves it, exactly like a text change.
//
// Photos that nothing points at any more (removed, replaced, or from a rejected edit) are
// deleted by pruneUnusedPhotos(), which runs after every change.
import * as listings from '../repositories/listingRepository.js';
import * as edits from '../repositories/listingEditRepository.js';
import * as photos from '../repositories/photoRepository.js';
import { createPhotoKey, processPhoto } from '../lib/photos.js';
import { HttpError } from '../lib/httpError.js';

function splitKeys(value) {
  if (Array.isArray(value)) return value;
  return value ? value.split('\n').filter(Boolean) : [];
}

/**
 * Step 1: checks and re-encodes any new uploads in `fields.photos`. Writes nothing, so call it
 * before saving anything else: a bad photo then means nothing is saved at all.
 */
export async function preparePhotos(fields) {
  if (!fields.photos) return fields;
  const prepared = [];
  for (const entry of fields.photos) {
    prepared.push(entry.upload ? { key: createPhotoKey(), ...(await processPhoto(entry.upload)) } : entry);
  }
  return { ...fields, photos: prepared };
}

/** "Keep" may only point at photos that already belong to this listing. */
async function checkKeptPhotos(listingId, prepared) {
  const owned = new Set(await photos.findKeysForListing(listingId));
  if (prepared.some((photo) => photo.keep && !owned.has(photo.keep))) {
    const message = 'One of the photos is no longer available. Please reload the page and try again.';
    throw new HttpError(400, message, { fields: { photos: message } });
  }
}

/**
 * Step 2: stores the new photos for `listingId` and returns `fields` with `photos` as an
 * ordered list of keys, ready to save on the listing or a pending edit.
 * Fields without `photos` (the form didn't send any) come back unchanged.
 */
export async function savePhotos(listingId, fields) {
  if (!fields.photos) return fields;
  await checkKeptPhotos(listingId, fields.photos);
  for (const photo of fields.photos) {
    if (photo.image) await photos.insert(listingId, photo);
  }
  return { ...fields, photos: fields.photos.map((photo) => photo.keep || photo.key) };
}

/** Deletes photos that neither the listing nor its pending edit uses any more. */
export async function pruneUnusedPhotos(listingId) {
  const listing = await listings.findById(listingId);
  if (!listing) return;
  const pendingEdit = await edits.findPendingForListing(listingId);
  const inUse = [...splitKeys(listing.photos), ...splitKeys(pendingEdit?.changes.photos)];
  await photos.deleteAllExcept(listingId, inUse);
}
