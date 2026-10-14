// Entry point for the "Add your business" page (submit.html).
import { api } from './api.js';
import { showStatus } from './dom.js';
import { clearFieldErrors, showFieldErrors, readForm } from './form-errors.js';

const form = document.getElementById('submit-form');
const formStatus = document.getElementById('form-status');
const successPanel = document.getElementById('success');
const submitButton = form.querySelector('button[type="submit"]');

function showSuccess() {
  form.hidden = true;
  successPanel.hidden = false;
  successPanel.querySelector('h2').focus();
}

async function submitRequest(event) {
  event.preventDefault();
  clearFieldErrors(form);
  showStatus(formStatus, 'Sending…');
  submitButton.disabled = true;

  try {
    await api.post('/api/listings', readForm(form));
    showSuccess();
  } catch (error) {
    showFieldErrors(form, error.fields || {});
    showStatus(formStatus, error.message, 'error');
    submitButton.disabled = false;
  }
}

form.addEventListener('submit', submitRequest);
