// A reusable "Are you sure?" pop-up with an optional note for the history log.
const dialog = document.getElementById('action-dialog');
const form = document.getElementById('action-form');
const title = document.getElementById('action-title');
const message = document.getElementById('action-message');
const noteInput = document.getElementById('action-note');
const confirmButton = document.getElementById('action-confirm');

dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());

/**
 * Opens the dialog and waits for the admin to choose.
 * @returns {Promise<{ note: string } | null>} The note when confirmed, or null when cancelled.
 */
export function confirmAction({ heading, text, confirmLabel, danger = false }) {
  title.textContent = heading;
  message.textContent = text;
  confirmButton.textContent = confirmLabel;
  confirmButton.className = danger ? 'button danger' : 'button';
  noteInput.value = '';

  return new Promise((resolve) => {
    function finish(result) {
      form.removeEventListener('submit', onConfirm);
      dialog.removeEventListener('close', onCancel);
      resolve(result);
    }
    function onConfirm(event) {
      event.preventDefault();
      finish({ note: noteInput.value.trim() });
      dialog.close();
    }
    function onCancel() {
      finish(null);
    }

    form.addEventListener('submit', onConfirm);
    dialog.addEventListener('close', onCancel);
    dialog.showModal();
  });
}
