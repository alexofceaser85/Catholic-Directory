// One-time setup: lets the directory send email from a Gmail account through the Gmail API.
//
// Needs GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (a "Desktop app" OAuth client) in the environment.
// Prints a sign-in link; after you allow access in the browser, prints ONLY the refresh token
// to stdout, so it can go straight into a variable without being shown:
//
//   TOKEN=$(node tools/gmail-authorize.js)
//
// Everything else (the link, progress, errors) goes to stderr. See docs/deployment.md.
import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';

// Send-only access: the app can never read, search or delete the account's mail.
// "email" only reveals which address was authorized, so we can show it as a check.
const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'email'];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} first (see docs/deployment.md).`);
    process.exit(1);
  }
  return value;
}

/** Starts a throwaway server on a free local port for Google to send the browser back to. */
function startCallbackServer() {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/** Resolves with the "code" Google adds to the callback URL once the user allows access. */
function waitForCode(server) {
  return new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const params = new URL(req.url, 'http://127.0.0.1').searchParams;
      const code = params.get('code');
      res.end(code ? 'Done. You can close this tab and go back to the terminal.' : 'Access was not granted.');
      if (code) resolve(code);
      else if (params.get('error')) reject(new Error(`Google said: ${params.get('error')}`));
    });
  });
}

/** Reads the signed-in address out of the ID token (a JWT) Google returns alongside the tokens. */
function emailFromIdToken(idToken) {
  if (!idToken) return 'unknown account';
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()).email;
}

async function main() {
  const server = await startCallbackServer();
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const client = new OAuth2Client(requireEnv('GMAIL_CLIENT_ID'), requireEnv('GMAIL_CLIENT_SECRET'), redirectUri);

  // "offline" + "consent" makes Google return a refresh token every time.
  const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
  console.error(`\nOpen this link, sign in as the directory's Gmail account and allow access:\n\n${url}\n`);

  const code = await waitForCode(server);
  server.close();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Run this again.');

  console.error(`Authorized: ${emailFromIdToken(tokens.id_token)}`);
  process.stdout.write(tokens.refresh_token);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
