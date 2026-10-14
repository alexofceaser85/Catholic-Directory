// All SQL for the `reports` table ("this listing is out of date").
import { query } from '../db/pool.js';

export async function insert(listingId, reason) {
  const result = await query('INSERT INTO reports (listing_id, reason) VALUES (?, ?)', [listingId, reason]);
  return result.insertId;
}

export async function findById(id) {
  const rows = await query('SELECT * FROM reports WHERE id = ?', [id]);
  return rows[0] || null;
}

export function findOpen() {
  return query("SELECT * FROM reports WHERE status = 'open' ORDER BY created_at ASC");
}

export async function countOpen() {
  const rows = await query("SELECT COUNT(*) AS total FROM reports WHERE status = 'open'");
  return Number(rows[0].total);
}

/** Closes one report. `resolution` is reverified, removed or dismissed. */
export async function resolve(id, resolution, adminEmail) {
  await query(
    `UPDATE reports SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW()
     WHERE id = ? AND status = 'open'`,
    [resolution, adminEmail, id],
  );
}

/** Closes every open report for a listing, e.g. after it is reverified or removed. */
export async function resolveAllForListing(listingId, resolution, adminEmail) {
  await query(
    `UPDATE reports SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW()
     WHERE listing_id = ? AND status = 'open'`,
    [resolution, adminEmail, listingId],
  );
}
