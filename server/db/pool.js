// Shared MySQL connection pool. Every query in the app goes through `query()`.
import mysql from 'mysql2/promise';
import config from '../config.js';

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z', // Read and write DATETIME values as UTC.
  dateStrings: ['DATE'], // DATE columns (expires_on) come back as "2026-10-14", not a Date at midnight.
});

// Make NOW() and CURRENT_TIMESTAMP use UTC too, so dates match no matter where MySQL runs.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

/** Runs a parameterized SQL statement and returns the rows (or the result info for writes). */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function closePool() {
  await pool.end();
}
