// Entry point for the "Manage your post" page (manage.html).
// The private token arrives after "#" in the emailed link (/manage#token=...). Browsers never
// send that part to the server or to other sites, so the page reads it here and sends it in
// request bodies only.
import { api } from './api.js';
import { showStatus } from './dom.js';
import { showFieldErrors } from './form-errors.js';
import { renderSummary } from './manage-summary.js';
import { showEditForm, readEditForm } from './poster-edit-form.js';
import { showLostLinkForm } from './lost-link-form.js';

const pageStatus = document.getElementById('page-status');
const postView = document.getElementById('post-view');
const summary = document.getElementById('post-summary');
const editForm = document.getElementById('edit-form');
const editStatus = document.getElementById('edit-status');
const removeDialog = document.getElementById('remove-dialog');

const token = new URLSearchParams(window.location.hash.slice(1)).get('token');

function show(post) {
  postView.hidden = false;
  renderSummary(summary, post, { onRenew: renew, onRemove: () => removeDialog.showModal() });
  showEditForm(post);
}

async function load(message = '') {
  try {
    show(await api.post('/api/manage/post', { token }));
    showStatus(pageStatus, message, 'success');
  } catch (error) {
    postView.hidden = true;
    showStatus(pageStatus, error.message, 'error');
    if (error.status === 404) showLostLinkForm();
  }
}

/** Runs one action, then reloads the post so the page shows its new state. */
async function act(path, body, successMessage) {
  try {
    const result = await api.post(path, { ...body, token });
    await load(typeof successMessage === 'function' ? successMessage(result) : successMessage);
    pageStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showStatus(pageStatus, error.message, 'error');
  }
}

function renew() {
  act('/api/manage/renew', {}, 'Done! Your post is good for another full stretch.');
}

function remove() {
  act('/api/manage/remove', {}, 'Your post has been removed from the directory.');
}

async function saveEdits(event) {
  event.preventDefault();
  const button = editForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const { needsReview } = await api.post('/api/manage/edit', { ...(await readEditForm()), token });
    await load(needsReview
      ? 'Thanks! Your changes were sent to an admin. The directory shows them once approved.'
      : 'Your changes are saved.');
    pageStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showFieldErrors(editForm, error.fields || {});
    showStatus(editStatus, error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

removeDialog.addEventListener('close', () => {
  if (removeDialog.returnValue === 'remove') remove();
});
editForm.addEventListener('submit', saveEdits);

if (token) load();
else showLostLinkForm();
