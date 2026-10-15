// Settings for tests that import modules which read server/config.js.
// Import this first; it must run before config.js is loaded.
process.env.DB_HOST ??= 'localhost';
process.env.DB_USER ??= 'test';
process.env.DB_NAME ??= 'test';
process.env.SESSION_SECRET ??= 'test-secret-that-is-at-least-32-characters-long';
process.env.PUBLIC_URL = 'https://directory.example.org';
