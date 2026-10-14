// The "Report outdated information" pop-up on the directory page.
import { api } from './api.js';
import { showStatus } from './dom.js';
import { clearFieldErrors, showFieldErrors, readForm } from './form-errors.js';

const dialog = document.getElementById('report-dialog');
const form = document.getElementById('report-form');
const businessName = document.getElementById('report-business');
const statusNode = document.getElementById('report-status');
const submitButton = form.querySelector('button[type="submit"]');

let currentListing = null;

export function openReportDialog(listing) {
  currentListing = listing;
  form.reset();
  clearFieldErrors(form);
  showStatus(statusNode, '');
  submitButton.disabled = false;
  businessName.textContent = listing.businessName;
  dialog.showModal();
}

async function sendReport(event) {
  event.preventDefault();
  submitButton.disabled = true;
  try {
    await api.post(`/api/listings/${currentListing.id}/reports`, readForm(form));
    showStatus(statusNode, 'Thank you! An admin will look into it.', 'success');
    setTimeout(() => dialog.close(), 1500);
  } catch (error) {
    showFieldErrors(form, error.fields || {});
    showStatus(statusNode, error.message, 'error');
    submitButton.disabled = false;
  }
}

form.addEventListener('submit', sendReport);
dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
