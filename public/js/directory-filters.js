// The post type buttons and category dropdown above the directory list.
import { el } from './dom.js';
import { CATEGORIES, POST_TYPES } from './post-options.js';

const ALL = '';

/**
 * Builds the filters inside `typeContainer` (buttons) and `categorySelect` (a <select>).
 * Calls `onChange` whenever a filter changes.
 * @returns {{ matches: (listing: object) => boolean }}
 */
export function setUpFilters(typeContainer, categorySelect, onChange) {
  let selectedType = ALL;

  function typeButton(label, value) {
    return el('button', {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(value === selectedType),
      onclick: () => {
        selectedType = value;
        typeContainer.querySelectorAll('.chip').forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
        typeContainer.querySelector(`[data-value="${CSS.escape(value)}"]`).setAttribute('aria-pressed', 'true');
        onChange();
      },
      'data-value': value,
    }, [label]);
  }

  typeContainer.replaceChildren(
    typeButton('Everything', ALL),
    ...POST_TYPES.map((type) => typeButton(type.filterLabel, type.label)),
  );
  categorySelect.replaceChildren(
    el('option', { value: ALL }, ['All categories']),
    ...CATEGORIES.map((category) => el('option', { value: category }, [category])),
  );
  categorySelect.addEventListener('change', onChange);

  return {
    matches: (listing) =>
      (selectedType === ALL || listing.postType === selectedType) &&
      (categorySelect.value === ALL || listing.category === categorySelect.value),
  };
}
