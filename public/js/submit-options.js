// The "What are you posting?" choices and the category dropdown on the submit page.
// Both are built from post-options.js, so the lists live in one place on the website.
import { el } from './dom.js';
import { CATEGORIES, POST_TYPES, findPostType } from './post-options.js';

function postTypeChoice(type) {
  const id = `post-type-${type.label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return el('label', { class: 'choice-card', for: id }, [
    el('input', { id, type: 'radio', name: 'postType', value: type.label, required: true }),
    el('span', {}, [
      el('span', { class: 'choice-title' }, [type.label]),
      el('span', { class: 'choice-summary' }, [type.summary]),
    ]),
  ]);
}

/** Changes the title field's label and example to match the chosen post type. */
function updateTitleField(postTypeLabel, titleLabel, titleInput) {
  const type = findPostType(postTypeLabel);
  titleLabel.textContent = `${type.titleLabel} *`;
  titleInput.placeholder = type.titlePlaceholder;
}

/**
 * @param {HTMLFormElement} form
 * @param {{ typeContainer: HTMLElement, categorySelect: HTMLSelectElement, titleLabel: HTMLElement, titleInput: HTMLInputElement }} parts
 */
export function setUpSubmitOptions(form, { typeContainer, categorySelect, titleLabel, titleInput }) {
  typeContainer.replaceChildren(...POST_TYPES.map(postTypeChoice));
  categorySelect.replaceChildren(
    el('option', { value: '' }, ['Choose a category…']),
    ...CATEGORIES.map((category) => el('option', { value: category }, [category])),
  );

  form.addEventListener('change', (event) => {
    if (event.target.name === 'postType') updateTitleField(event.target.value, titleLabel, titleInput);
  });
  updateTitleField('', titleLabel, titleInput);
}
