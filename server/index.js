// Entry point: `npm start` runs this file.
import config from './config.js';
import { createApp } from './app.js';
import { closePool } from './db/pool.js';

const server = createApp().listen(config.port, () => {
  console.log(`CLM Directory running at http://localhost:${config.port}`);
  if (config.devAdminLogin) {
    console.warn('WARNING: email-only test sign-in is ON (NODE_ENV=development, DEV_ADMIN_LOGIN=true).');
    console.warn('Anyone who knows an admin email can sign in. Never run the live site this way.');
  }
});

// Finish in-flight requests and close database connections on shutdown.
function shutdown() {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
