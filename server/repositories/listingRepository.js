// All SQL for the `listings` table lives here. Functions take and return plain
// database rows (snake_case columns); presenters/listingPresenter.js converts them for the API.
import { query } from '../db/pool.js';

// Maps API field names (camelCase) to database columns for inserts and edits.
const COLUMNS = {
  submitterFirstName: 'submitter_first_name',
  submitterLastName: 'submitter_last_name',
  businessName: 'business_name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  description: 'description',
  website: 'website',
  links: 'links',
  adminNotes: 'admin_notes',
};

const PUBLIC_SELECT = `
  SELECT id, business_name, email, phone, address, description, website, links, last_verified_at
  FROM listings`;

const ADMIN_SELECT = `
  SELECT *, DATEDIFF(NOW(), last_verified_at) AS days_since_verified
  FROM listings`;

function toColumnValues(fields) {
  const entries = Object.entries(fields).filter(([field]) => COLUMNS[field]);
  return {
    columns: entries.map(([field]) => COLUMNS[field]),
    values: entries.map(([, value]) => (Array.isArray(value) ? value.join('\n') : value)),
  };
}

export function findApproved() {
  return query(`${PUBLIC_SELECT} WHERE status = 'approved' ORDER BY business_name`);
}

export async function findPublicById(id) {
  const rows = await query(`${PUBLIC_SELECT} WHERE id = ? AND status = 'approved'`, [id]);
  return rows[0] || null;
}

export async function findById(id) {
  const rows = await query(`${ADMIN_SELECT} WHERE id = ?`, [id]);
  return rows[0] || null;
}

export function findByIds(ids) {
  if (ids.length === 0) return Promise.resolve([]);
  const placeholders = ids.map(() => '?').join(', ');
  return query(`${ADMIN_SELECT} WHERE id IN (${placeholders})`, ids);
}

export function findByStatus(status) {
  const order = status === 'pending' ? 'submitted_at ASC' : 'business_name ASC';
  return query(`${ADMIN_SELECT} WHERE status = ? ORDER BY ${order}`, [status]);
}

/** Live listings whose last verification is at least `days` days old, oldest first. */
export function findNeedingReverification(days) {
  return query(
    `${ADMIN_SELECT}
     WHERE status = 'approved' AND last_verified_at <= NOW() - INTERVAL ? DAY
     ORDER BY last_verified_at ASC`,
    [days],
  );
}

export async function countByStatus() {
  const rows = await query('SELECT status, COUNT(*) AS total FROM listings GROUP BY status');
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]));
}

export async function countNeedingReverification(days) {
  const rows = await query(
    `SELECT COUNT(*) AS total FROM listings
     WHERE status = 'approved' AND last_verified_at <= NOW() - INTERVAL ? DAY`,
    [days],
  );
  return Number(rows[0].total);
}

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

/** Records an admin decision. Approving also starts the verification counter. */
export async function updateStatus(id, status) {
  const verifiedClause = status === 'approved' ? ', last_verified_at = NOW()' : '';
  await query(`UPDATE listings SET status = ?, reviewed_at = NOW()${verifiedClause} WHERE id = ?`, [status, id]);
}

/** Resets the verification counter to zero days. */
export async function markVerified(id) {
  await query('UPDATE listings SET last_verified_at = NOW() WHERE id = ?', [id]);
}
