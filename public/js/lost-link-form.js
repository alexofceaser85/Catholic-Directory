// "Lost your link?" on the "Manage your post" page: emails fresh links to the contact address.
import { api } from './api.js';
import { showStatus } from './dom.js';
import { clearFieldErrors, showFieldErrors, readForm } from './form-errors.js';

const view = document.getElementById('lost-link-view');
const form = document.getElementById('lost-link-form');
const statusNode = document.getElementById('lost-link-status');
const button = form.querySelector('button[type="submit"]');

async function requestLinks(event) {
  event.preventDefault();
  clearFieldErrors(form);
  button.disabled = true;
  try {
    await api.post('/api/manage/send-links', readForm(form));
    // Same message either way, so nobody can use this to check who has posted.
    showStatus(statusNode, 'If there are posts with that email, we\'ve sent a link for each one. Check your inbox (and spam folder).', 'success');
  } catch (error) {
    showFieldErrors(form, error.fields || {});
    showStatus(statusNode, error.message, 'error');
    button.disabled = false;
  }
}

export function showLostLinkForm() {
  view.hidden = false;
}

form.addEventListener('submit', requestLinks);
