// The "Edit listing" pop-up. Fills the form from a listing and saves with PUT /api/admin/listings/:id.
import { api } from '/js/api.js';
import { showStatus } from '/js/dom.js';
import { el } from '/js/dom.js';
import { clearFieldErrors, showFieldErrors, readForm } from '/js/form-errors.js';
import { CATEGORIES, POST_TYPES } from '/js/post-options.js';
import { createPhotoPicker } from '/js/photo-picker.js';

const dialog = document.getElementById('edit-dialog');
const form = document.getElementById('edit-form');
const statusNode = document.getElementById('edit-status');
const saveButton = form.querySelector('button[type="submit"]');
const photoPicker = createPhotoPicker(document.getElementById('edit-photo-picker'));

const EDITABLE_FIELDS = ['title', 'postType', 'category', 'parish', 'email', 'phone', 'address', 'description', 'website', 'adminNotes'];

dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());

function fillOptions(select, values) {
  select.replaceChildren(...values.map((value) => el('option', { value }, [value])));
}
fillOptions(form.elements.postType, POST_TYPES.map((type) => type.label));
fillOptions(form.elements.category, CATEGORIES);

function fillForm(listing) {
  for (const field of EDITABLE_FIELDS) {
    form.elements[field].value = listing[field] ?? '';
  }
  form.elements.links.value = listing.links.join('\n');
  photoPicker.setPhotos(listing.photos);
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
        await api.put(`/api/admin/listings/${listing.id}`, { ...readForm(form), photos: await photoPicker.entries() });
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
