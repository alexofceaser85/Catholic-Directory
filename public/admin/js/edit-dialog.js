// The "Edit listing" pop-up. Fills the form from a listing and saves with PUT /api/admin/listings/:id.
import { api } from '/js/api.js';
import { showStatus } from '/js/dom.js';
import { clearFieldErrors, showFieldErrors, readForm } from '/js/form-errors.js';

const dialog = document.getElementById('edit-dialog');
const form = document.getElementById('edit-form');
const statusNode = document.getElementById('edit-status');
const saveButton = form.querySelector('button[type="submit"]');

const EDITABLE_FIELDS = ['businessName', 'email', 'phone', 'address', 'description', 'website', 'adminNotes'];

dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());

function fillForm(listing) {
  for (const field of EDITABLE_FIELDS) {
    form.elements[field].value = listing[field] ?? '';
  }
  form.elements.links.value = listing.links.join('\n');
}

/**
 * Opens the editor for a listing.
 * @returns {Promise<boolean>} true if changes were saved, false if cancelled.
 */
export function openEditDialog(listing) {
  fillForm(listing);
  clearFieldErrors(form);
  showStatus(statusNode, '');
  saveButton.disabled = false;

  return new Promise((resolve) => {
    let saved = false;

    async function onSave(event) {
      event.preventDefault();
      saveButton.disabled = true;
      try {
        await api.put(`/api/admin/listings/${listing.id}`, readForm(form));
        saved = true;
        dialog.close();
      } catch (error) {
        showFieldErrors(form, error.fields || {});
        showStatus(statusNode, error.message, 'error');
        saveButton.disabled = false;
      }
    }
    function onClose() {
      form.removeEventListener('submit', onSave);
      dialog.removeEventListener('close', onClose);
      resolve(saved);
    }

    form.addEventListener('submit', onSave);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}
