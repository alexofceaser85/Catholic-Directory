// All SQL for the `listings` table lives here. Functions take and return plain
// database rows (snake_case columns); presenters/listingPresenter.js converts them for the API.
import { query } from '../db/pool.js';

// Maps API field names (camelCase) to database columns for inserts and edits.
const COLUMNS = {
  postType: 'post_type',
  category: 'category',
  submitterFirstName: 'submitter_first_name',
  submitterLastName: 'submitter_last_name',
  title: 'title',
  email: 'email',
  phone: 'phone',
  address: 'address',
  parish: 'parish',
  description: 'description',
  website: 'website',
  links: 'links',
  photos: 'photos',
  adminNotes: 'admin_notes',
  manageTokenHash: 'manage_token_hash',
};

// "Live" = approved and not past its expiry date. Businesses have no expiry date.
const IS_LIVE = "status = 'approved' AND (expires_on IS NULL OR expires_on >= CURRENT_DATE())";

const PUBLIC_SELECT = `
  SELECT id, post_type, category, title, email, phone, address, parish, description, website, links, photos,
         last_verified_at, expires_on
  FROM listings`;

const ADMIN_SELECT = `
  SELECT *,
         DATEDIFF(NOW(), last_verified_at) AS days_since_verified,
         (expires_on < CURRENT_DATE()) AS is_expired
  FROM listings`;

// Approved businesses not verified in at least `?` days.
const NEEDS_REVERIFICATION = `
  status = 'approved' AND post_type = 'business' AND last_verified_at <= NOW() - INTERVAL ? DAY`;

const IS_EXPIRED = "status = 'approved' AND expires_on < CURRENT_DATE()";

function toColumnValues(fields) {
  const entries = Object.entries(fields).filter(([field]) => COLUMNS[field]);
  return {
    columns: entries.map(([field]) => COLUMNS[field]),
    values: entries.map(([, value]) => (Array.isArray(value) ? value.join('\n') : value)),
  };
}

async function firstRow(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function count(where, params = []) {
  const rows = await query(`SELECT COUNT(*) AS total FROM listings WHERE ${where}`, params);
  return Number(rows[0].total);
}

// ---- Public ------------------------------------------------------------------

export function findLive() {
  return query(`${PUBLIC_SELECT} WHERE ${IS_LIVE} ORDER BY title`);
}

export function findLiveById(id) {
  return firstRow(`${PUBLIC_SELECT} WHERE id = ? AND ${IS_LIVE}`, [id]);
}

// ---- Posters (through their private link) -----------------------------------

export function findByManageTokenHash(hash) {
  return firstRow(`${ADMIN_SELECT} WHERE manage_token_hash = ?`, [hash]);
}

/** Posts someone could still manage: waiting for review or live. */
export function findManageableByEmail(email) {
  return query(`${ADMIN_SELECT} WHERE email = ? AND status IN ('pending', 'approved') ORDER BY submitted_at`, [email]);
}

export async function setManageTokenHash(id, hash) {
  await query('UPDATE listings SET manage_token_hash = ? WHERE id = ?', [hash, id]);
}

// ---- Admin -------------------------------------------------------------------

export function findById(id) {
  return firstRow(`${ADMIN_SELECT} WHERE id = ?`, [id]);
}

export function findByIds(ids) {
  if (ids.length === 0) return Promise.resolve([]);
  const placeholders = ids.map(() => '?').join(', ');
  return query(`${ADMIN_SELECT} WHERE id IN (${placeholders})`, ids);
}

export function findByStatus(status) {
  const order = status === 'pending' ? 'submitted_at ASC' : 'title ASC';
  return query(`${ADMIN_SELECT} WHERE status = ? ORDER BY ${order}`, [status]);
}

/** Live businesses whose last verification is at least `days` days old, oldest first. */
export function findNeedingReverification(days) {
  return query(`${ADMIN_SELECT} WHERE ${NEEDS_REVERIFICATION} ORDER BY last_verified_at ASC`, [days]);
}

/** Approved services / help-wanted posts past their expiry date, most recently expired first. */
export function findExpired() {
  return query(`${ADMIN_SELECT} WHERE ${IS_EXPIRED} ORDER BY expires_on DESC`);
}

export async function countByStatus() {
  const rows = await query('SELECT status, COUNT(*) AS total FROM listings GROUP BY status');
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]));
}

export function countNeedingReverification(days) {
  return count(NEEDS_REVERIFICATION, [days]);
}

export function countExpired() {
  return count(IS_EXPIRED);
}

// ---- Writing -----------------------------------------------------------------

export async function insert(fields) {
  const { columns, values } = toColumnValues(fields);
  const placeholders = columns.map(() => '?').join(', ');
  const result = await query(`INSERT INTO listings (${columns.join(', ')}) VALUES (${placeholders})`, values);
  return result.insertId;
}

export async function update(id, fields) {
  const { columns, values } = toColumnValues(fields);
  if (columns.length === 0) return;
  const assignments = columns.map((column) => `${column} = ?`).join(', ');
  await query(`UPDATE listings SET ${assignments} WHERE id = ?`, [...values, id]);
}

/** Records an admin (or poster) decision: approve, deny or remove. */
export async function updateStatus(id, status) {
  await query('UPDATE listings SET status = ?, reviewed_at = NOW() WHERE id = ?', [status, id]);
}

/**
 * Starts the clock again: "last verified" becomes now and, for posts that expire,
 * the expiry date becomes today + `expiresAfterDays`. Used on approval, reverification and renewal.
 * @param {number|null} expiresAfterDays null for businesses (no expiry date).
 */
export async function restartShelfLife(id, expiresAfterDays) {
  await query(
    `UPDATE listings
     SET last_verified_at = NOW(),
         expires_on = IF(? IS NULL, NULL, CURRENT_DATE() + INTERVAL ? DAY)
     WHERE id = ?`,
    [expiresAfterDays, expiresAfterDays ?? 0, id],
  );
}
