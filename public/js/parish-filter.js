// The "Parishes" filter above the directory list: a dropdown of checkboxes, one per parish
// named on a live listing, so people can pick their own parish plus the ones around it.
// Nothing ticked = every parish.
import { el } from './dom.js';

/** "St. Joseph's", "Saint Joseph’s" and " st joseph's" all give the same key. */
export function parishKey(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // é -> e
    .replace(/\bsaint\b/g, 'st')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** One choice per parish (the first spelling seen), sorted A to Z. */
export function parishChoices(listings) {
  const labels = new Map();
  for (const { parish } of listings) {
    const key = parishKey(parish);
    if (key && !labels.has(key)) labels.set(key, parish.trim());
  }
  return [...labels]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * @param {HTMLDetailsElement} details  <details> with a <summary> and a .parish-options box.
 * @param {() => void} onChange  Called whenever a box is ticked or cleared.
 */
export function setUpParishFilter(details, onChange) {
  const summary = details.querySelector('summary');
  const optionsBox = details.querySelector('.parish-options');
  const selected = new Map(); // key -> label

  function updateSummary() {
    const labels = [...selected.values()];
    if (labels.length === 0) summary.textContent = 'All parishes';
    else if (labels.length === 1) summary.textContent = labels[0];
    else summary.textContent = `${labels.length} parishes`;
  }

  function toggle(choice, checked) {
    if (checked) selected.set(choice.key, choice.label);
    else selected.delete(choice.key);
    updateSummary();
    onChange();
  }

  function checkbox(choice) {
    const input = el('input', { type: 'checkbox', value: choice.key, onchange: (event) => toggle(choice, event.target.checked) });
    input.checked = selected.has(choice.key);
    return el('label', { class: 'parish-option' }, [input, choice.label]);
  }

  function clearAll() {
    selected.clear();
    optionsBox.querySelectorAll('input').forEach((input) => { input.checked = false; });
    updateSummary();
    onChange();
  }

  // Close the dropdown when clicking anywhere else on the page.
  document.addEventListener('click', (event) => {
    if (details.open && !details.contains(event.target)) details.open = false;
  });

  return {
    /** Rebuilds the choices from the loaded listings. */
    setListings(listings) {
      const choices = parishChoices(listings);
      details.hidden = choices.length === 0;
      optionsBox.replaceChildren(
        ...choices.map(checkbox),
        el('button', { type: 'button', class: 'link-button small', onclick: clearAll }, ['Clear']),
      );
    },
    matches: (listing) => selected.size === 0 || selected.has(parishKey(listing.parish)),
  };
}
