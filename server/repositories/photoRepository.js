// All SQL for `listing_photos`: the image files themselves.
// Which photos a post shows, and in what order, is the `photos` column on `listings`
// (or on a pending edit), so photo changes go through the same review as text changes.
import { query } from '../db/pool.js';

export async function insert(listingId, { key, image, width, height }) {
  await query(
    'INSERT INTO listing_photos (listing_id, photo_key, image, width, height) VALUES (?, ?, ?, ?, ?)',
    [listingId, key, image, width, height],
  );
}

export async function findImageByKey(key) {
  const rows = await query('SELECT image FROM listing_photos WHERE photo_key = ?', [key]);
  return rows[0] || null;
}

export async function findKeysForListing(listingId) {
  const rows = await query('SELECT photo_key FROM listing_photos WHERE listing_id = ?', [listingId]);
  return rows.map((row) => row.photo_key);
}

/** Deletes the listing's photos except the ones in `keepKeys`. */
export async function deleteAllExcept(listingId, keepKeys) {
  if (keepKeys.length === 0) {
    await query('DELETE FROM listing_photos WHERE listing_id = ?', [listingId]);
    return;
  }
  const placeholders = keepKeys.map(() => '?').join(', ');
  await query(`DELETE FROM listing_photos WHERE listing_id = ? AND photo_key NOT IN (${placeholders})`, [listingId, ...keepKeys]);
}
