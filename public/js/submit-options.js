// The "What are you posting?" choices and the category dropdown on the submit page.
// Both are built from post-options.js, so the lists live in one place on the website.
import { el } from './dom.js';
import { api } from './api.js';
import {
  CATEGORIES, POST_TYPES, UNTIL_DATE, addDays, durationChoices, durationLabel, findPostType, isoDate,
} from './post-options.js';

const DEFAULT_MAX_POST_DAYS = 90; // Until /api/settings answers with the server's MAX_POST_DAYS.

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
 * "How long should it show?": the four lengths (longest first, the default) or "Until a date",
 * which shows a date box limited to the next `maxDays` days. Businesses stay listed, so the
 * whole section is hidden for them (the server ignores it for them too).
 */
function setUpDurationField(durationField) {
  const select = durationField.querySelector('select');
  const dateField = durationField.querySelector('#end-date-field');
  const dateInput = dateField.querySelector('input');

  function showDateWhenChosen() {
    dateField.hidden = select.value !== UNTIL_DATE;
  }

  function fillChoices(maxDays) {
    const previous = select.value;
    const lengths = durationChoices(maxDays).reverse();
    select.replaceChildren(
      ...lengths.map((days) => el('option', { value: String(days) }, [durationLabel(days)])),
      el('option', { value: UNTIL_DATE }, ['Until a date I pick…']),
    );
    if ([...select.options].some((option) => option.value === previous)) select.value = previous;
    const today = isoDate(new Date());
    dateInput.min = addDays(today, 1);
    dateInput.max = addDays(today, maxDays);
    showDateWhenChosen();
  }

  select.addEventListener('change', showDateWhenChosen);
  fillChoices(DEFAULT_MAX_POST_DAYS);
  api.get('/api/settings').then(({ maxPostDays }) => fillChoices(maxPostDays)).catch(() => {});

  return {
    /** Shown only for post types that expire. */
    showFor(postTypeLabel) {
      durationField.hidden = !postTypeLabel || !findPostType(postTypeLabel).expires;
    },
  };
}

/**
 * @param {HTMLFormElement} form
 * @param {{ typeContainer: HTMLElement, categorySelect: HTMLSelectElement, titleLabel: HTMLElement,
 *           titleInput: HTMLInputElement, durationField: HTMLFieldSetElement }} parts
 */
export function setUpSubmitOptions(form, { typeContainer, categorySelect, titleLabel, titleInput, durationField }) {
  const duration = setUpDurationField(durationField);
  typeContainer.replaceChildren(...POST_TYPES.map(postTypeChoice));
  categorySelect.replaceChildren(
    el('option', { value: '' }, ['Choose a category…']),
    ...CATEGORIES.map((category) => el('option', { value: category }, [category])),
  );

  form.addEventListener('change', (event) => {
    if (event.target.name !== 'postType') return;
    updateTitleField(event.target.value, titleLabel, titleInput);
    duration.showFor(event.target.value);
  });
  updateTitleField('', titleLabel, titleInput);
  duration.showFor('');
}
