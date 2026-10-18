// The parish box on the submit and edit forms. As people type it suggests the Archdiocese's
// parishes (plus any others already used in the directory), and it swaps a close match like
// "st. brigid, johns creek" for the listed spelling, so the parish filter stays tidy.
import { api } from './api.js';
import { el } from './dom.js';
import { ARCHDIOCESE_PARISHES } from './parishes.js';
import { parishChoices, parishKey } from './parish-filter.js';

/** Spellings by key: the Archdiocese's list first, then any others live posts already use. */
function knownParishes(listings) {
  const known = new Map(ARCHDIOCESE_PARISHES.map((name) => [parishKey(name), name]));
  for (const { key, label } of parishChoices(listings)) {
    if (!known.has(key)) known.set(key, label);
  }
  return known;
}

/** @param {HTMLInputElement} input */
export function setUpParishInput(input) {
  const suggestions = el('datalist', { id: `${input.id}-suggestions` });
  input.after(suggestions);
  input.setAttribute('list', suggestions.id);
  input.autocomplete = 'off';

  let known = knownParishes([]);
  function fillSuggestions() {
    const names = [...known.values()].sort((a, b) => a.localeCompare(b));
    suggestions.replaceChildren(...names.map((name) => el('option', { value: name })));
  }

  input.addEventListener('change', () => {
    const listed = known.get(parishKey(input.value));
    if (listed) input.value = listed;
  });

  fillSuggestions();
  // Parishes outside the Archdiocese that other posts use. The form works without them.
  api.get('/api/listings')
    .then((listings) => {
      known = knownParishes(listings);
      fillSuggestions();
    })
    .catch(() => {});
}
