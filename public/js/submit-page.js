// Entry point for the "Add a listing" page (submit.html).
import { api } from './api.js';
import { showStatus } from './dom.js';
import { clearFieldErrors, showFieldErrors, readForm } from './form-errors.js';
import { setUpSubmitOptions } from './submit-options.js';
import { createPhotoPicker } from './photo-picker.js';
import { setUpParishInput } from './parish-input.js';

const form = document.getElementById('submit-form');
const formStatus = document.getElementById('form-status');
const successPanel = document.getElementById('success');
const submitButton = form.querySelector('button[type="submit"]');
const photoPicker = createPhotoPicker(document.getElementById('photo-picker'));
setUpParishInput(document.getElementById('parish'));

setUpSubmitOptions(form, {
  typeContainer: document.getElementById('post-type-choices'),
  categorySelect: document.getElementById('category'),
  titleLabel: document.getElementById('title-label'),
  titleInput: document.getElementById('title'),
  durationField: document.getElementById('duration-field'),
});

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
    await api.post('/api/listings', { ...readForm(form), photos: await photoPicker.entries() });
    showSuccess();
  } catch (error) {
    showFieldErrors(form, error.fields || {});
    showStatus(formStatus, error.message, 'error');
    submitButton.disabled = false;
  }
}

form.addEventListener('submit', submitRequest);
