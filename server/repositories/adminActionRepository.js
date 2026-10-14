// All SQL for the `admin_actions` audit trail.
import { query } from '../db/pool.js';

export async function insert(listingId, adminEmail, action, detail = null) {
  await query(
    'INSERT INTO admin_actions (listing_id, admin_email, action, detail) VALUES (?, ?, ?, ?)',
    [listingId, adminEmail, action, detail],
  );
}

export function findForListing(listingId) {
  return query(
    'SELECT * FROM admin_actions WHERE listing_id = ? ORDER BY created_at DESC, id DESC',
    [listingId],
  );
}
