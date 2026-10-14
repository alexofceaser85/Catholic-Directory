// Entry point for the admin page: show the dashboard if signed in, otherwise the sign-in screen.
import { api } from '/js/api.js';
import { showLogin } from './login.js';
import { startDashboard } from './dashboard.js';

const emailLabel = document.getElementById('admin-email');
const logoutButton = document.getElementById('logout-button');

function onSignedIn(email) {
  emailLabel.textContent = email;
  logoutButton.hidden = false;
  startDashboard();
}

async function signOut() {
  await api.post('/api/auth/logout');
  window.location.reload();
}

async function init() {
  const { email } = await api.get('/api/auth/me').catch(() => ({ email: null }));
  if (email) onSignedIn(email);
  else showLogin(onSignedIn);
}

logoutButton.addEventListener('click', signOut);
init();
