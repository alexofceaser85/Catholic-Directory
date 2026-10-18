// The edit form on the "Manage your post" page.
import { el, showStatus } from './dom.js';
import { clearFieldErrors, readForm } from './form-errors.js';
import { CATEGORIES, findPostType } from './post-options.js';
import { createPhotoPicker } from './photo-picker.js';
import { setUpParishInput } from './parish-input.js';

const FIELDS = ['title', 'category', 'parish', 'email', 'phone', 'address', 'description', 'website'];

const form = document.getElementById('edit-form');
const hint = document.getElementById('edit-hint');
const photoPicker = createPhotoPicker(document.getElementById('photo-picker'));
setUpParishInput(form.elements.parish);

function fillCategories(select) {
  select.replaceChildren(...CATEGORIES.map((category) => el('option', { value: category }, [category])));
}

/** Shows the poster's pending changes if there are any, otherwise the current post. */
function fillFields(post) {
  const values = post.pendingEdit ? post.pendingEdit.changes : post;
  for (const field of FIELDS) form.elements[field].value = values[field] ?? '';
  form.elements.links.value = [].concat(values.links ?? []).join('\n');
  photoPicker.setPhotos(values.photos ?? []);
}

function hintText(post) {
  return post.status === 'approved'
    ? 'Your post is live, so changes are checked by an admin before they appear. Everything here is public; please leave out personal names.'
    : 'Everything here is public; please leave out personal names.';
}

/** Fills the form for `post`. Hidden for removed posts, which can't be edited. */
export function showEditForm(post) {
  form.hidden = post.status === 'removed';
  if (form.hidden) return;

  fillCategories(form.elements.category);
  fillFields(post);
  document.getElementById('title-label').textContent = `${findPostType(post.postType).titleLabel} *`;
  hint.textContent = hintText(post);
  clearFieldErrors(form);
  showStatus(document.getElementById('edit-status'), '');
}

export async function readEditForm() {
  return { ...readForm(form), photos: await photoPicker.entries() };
}
