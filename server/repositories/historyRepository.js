// All SQL for the `listing_history` table: who did what to a listing, and when.
import { query } from '../db/pool.js';

/** The `actor` for actions taken through a poster's private link. */
export const POSTER = 'poster';

export async function insert(listingId, actor, action, detail = null) {
  await query(
    'INSERT INTO listing_history (listing_id, actor, action, detail) VALUES (?, ?, ?, ?)',
    [listingId, actor, action, detail],
  );
}

export function findForListing(listingId) {
  return query(
    'SELECT * FROM listing_history WHERE listing_id = ? ORDER BY created_at DESC, id DESC',
    [listingId],
  );
}
