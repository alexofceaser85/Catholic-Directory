// Entry point: `npm start` runs this file.
import config from './config.js';
import { createApp } from './app.js';
import { closePool } from './db/pool.js';
import { mailMethod } from './lib/mailer.js';

const server = createApp().listen(config.port, () => {
  console.log(`Local Catholic Bulletin running at http://localhost:${config.port}`);
  const method = mailMethod();
  if (method) {
    console.log(`Sending email with ${method === 'gmail-api' ? 'the Gmail API' : `SMTP (${config.mail.host})`}.`);
  } else {
    console.warn(config.isProduction
      ? 'WARNING: no mail settings, so posters will not receive their "manage your post" links.'
      : 'No mail settings: emails will be printed here instead of sent.');
  }
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
