// The "What are you posting?" choices and the category dropdown on the submit page.
// Both are built from post-options.js, so the lists live in one place on the website.
import { el } from './dom.js';
import { CATEGORIES, POST_TYPES, durationLabel, findPostType } from './post-options.js';

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
 * Offers the post type's lengths, longest first (the default). Hidden for businesses,
 * which stay listed. Keeps the poster's pick when they switch between types that both offer it.
 */
function updateDurationField(postTypeLabel, durationField) {
  const choices = postTypeLabel ? findPostType(postTypeLabel).durationChoices ?? [] : [];
  const select = durationField.querySelector('select');
  const previous = Number(select.value);
  select.replaceChildren(...[...choices].reverse().map((days) => el('option', { value: String(days) }, [durationLabel(days)])));
  if (choices.includes(previous)) select.value = String(previous);
  durationField.hidden = choices.length === 0;
}

/**
 * @param {HTMLFormElement} form
 * @param {{ typeContainer: HTMLElement, categorySelect: HTMLSelectElement, titleLabel: HTMLElement,
 *           titleInput: HTMLInputElement, durationField: HTMLElement }} parts
 */
export function setUpSubmitOptions(form, { typeContainer, categorySelect, titleLabel, titleInput, durationField }) {
  typeContainer.replaceChildren(...POST_TYPES.map(postTypeChoice));
  categorySelect.replaceChildren(
    el('option', { value: '' }, ['Choose a category…']),
    ...CATEGORIES.map((category) => el('option', { value: category }, [category])),
  );

  form.addEventListener('change', (event) => {
    if (event.target.name !== 'postType') return;
    updateTitleField(event.target.value, titleLabel, titleInput);
    updateDurationField(event.target.value, durationField);
  });
  updateTitleField('', titleLabel, titleInput);
}
