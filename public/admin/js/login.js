// The admin sign-in screen: "Sign in with Google", plus an email-only form in local development.
import { api } from '/js/api.js';
import { showStatus } from '/js/dom.js';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

const loginView = document.getElementById('login-view');
const googleButton = document.getElementById('google-button');
const devLoginForm = document.getElementById('dev-login-form');
const loginStatus = document.getElementById('login-status');

let signedInCallback = () => {};

async function completeSignIn(path, body) {
  try {
    const { email } = await api.post(path, body);
    loginView.hidden = true;
    signedInCallback(email);
  } catch (error) {
    showStatus(loginStatus, error.message, 'error');
  }
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection or ad blocker.'));
    document.head.append(script);
  });
}

async function renderGoogleButton(clientId) {
  await loadGoogleScript();
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: ({ credential }) => completeSignIn('/api/auth/google', { credential }),
  });
  window.google.accounts.id.renderButton(googleButton, { theme: 'outline', size: 'large', text: 'signin_with' });
}

function enableDevLogin() {
  devLoginForm.hidden = false;
  devLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    completeSignIn('/api/auth/dev-login', { email: devLoginForm.elements.email.value });
  });
}

/** Shows the sign-in screen. `onSignedIn(email)` runs after a successful sign-in. */
export async function showLogin(onSignedIn) {
  signedInCallback = onSignedIn;
  loginView.hidden = false;
  try {
    const { googleClientId, devLogin } = await api.get('/api/auth/config');
    if (devLogin) enableDevLogin();
    if (googleClientId) await renderGoogleButton(googleClientId);
    else if (!devLogin) showStatus(loginStatus, 'Google sign-in is not configured yet. Set GOOGLE_CLIENT_ID on the server.', 'error');
  } catch (error) {
    showStatus(loginStatus, error.message, 'error');
  }
}
