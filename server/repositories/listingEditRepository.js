// All SQL for `listing_edits`: changes a poster asked for on a live post, waiting for an admin.
import { query } from '../db/pool.js';

/** Saves a new pending edit. An older pending edit for the same listing is marked "replaced". */
export async function replacePending(listingId, changes) {
  await query("UPDATE listing_edits SET status = 'replaced' WHERE listing_id = ? AND status = 'pending'", [listingId]);
  await query('INSERT INTO listing_edits (listing_id, changes) VALUES (?, ?)', [listingId, JSON.stringify(changes)]);
}

export async function findById(id) {
  const rows = await query('SELECT * FROM listing_edits WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function findPendingForListing(listingId) {
  const rows = await query("SELECT * FROM listing_edits WHERE listing_id = ? AND status = 'pending'", [listingId]);
  return rows[0] || null;
}

export function findPending() {
  return query("SELECT * FROM listing_edits WHERE status = 'pending' ORDER BY created_at ASC");
}

export async function countPending() {
  const rows = await query("SELECT COUNT(*) AS total FROM listing_edits WHERE status = 'pending'");
  return Number(rows[0].total);
}

/** `status` is approved or rejected. Only changes an edit that is still pending. */
export async function markReviewed(id, status, reviewer) {
  await query(
    "UPDATE listing_edits SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'",
    [status, reviewer, id],
  );
}

/** Drops any pending edit, e.g. when the post is removed. */
export async function discardPendingForListing(listingId) {
  await query("UPDATE listing_edits SET status = 'replaced' WHERE listing_id = ? AND status = 'pending'", [listingId]);
}
