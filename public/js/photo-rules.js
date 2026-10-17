// Photo limits, shared by the browser (photo-picker.js) and the server (validation, lib/photos.js),
// so both always agree.

/** Most photos one post can have. */
export const MAX_PHOTOS = 4;

/** Photos are shrunk so their longest side is at most this many pixels. */
export const MAX_PHOTO_SIDE = 1600;

/** Largest single upload the server accepts (the browser shrinks photos well below this first). */
export const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;

/** Where a stored photo is served from. `key` is the photo's random id. */
export function photoUrl(key) {
  return `/photos/${key}.webp`;
}
