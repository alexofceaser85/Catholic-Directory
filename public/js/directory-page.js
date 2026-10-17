// Entry point for the public directory page (index.html):
// loads live listings from the server, renders them, and filters them by
// post type, category, parish and the search box.
import { api } from './api.js';
import { setUpFilters } from './directory-filters.js';
import { showStatus } from './dom.js';
import { plural } from './format.js';
import { renderListingCard, searchableText, updateDescriptionToggles } from './listing-card.js';
import { setUpParishFilter } from './parish-filter.js';
import { openReportDialog } from './report-dialog.js';

const listContainer = document.getElementById('listings');
const searchInput = document.getElementById('search');
const resultCount = document.getElementById('result-count');
const pageStatus = document.getElementById('page-status');
const filters = setUpFilters(document.getElementById('type-filter'), document.getElementById('category-filter'), render);
const parishFilter = setUpParishFilter(document.getElementById('parish-filter'), render);

let allListings = [];

function matchesSearch(listing, words) {
  const text = searchableText(listing);
  return words.every((word) => text.includes(word));
}

function render() {
  const words = searchInput.value.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = allListings.filter(
    (listing) => filters.matches(listing) && parishFilter.matches(listing) && matchesSearch(listing, words),
  );

  listContainer.replaceChildren(...visible.map((listing) => renderListingCard(listing, openReportDialog)));
  updateDescriptionToggles(listContainer);
  resultCount.textContent = plural(visible.length, 'listing');

  if (allListings.length === 0) showStatus(pageStatus, 'Nothing is listed yet. Be the first to add yours!');
  else if (visible.length === 0) showStatus(pageStatus, 'Nothing matches your filters. Try "Everything", "All categories" or "All parishes".');
  else showStatus(pageStatus, '');
}

async function loadListings() {
  showStatus(pageStatus, 'Loading the directory…');
  try {
    allListings = await api.get('/api/listings');
    parishFilter.setListings(allListings);
    render();
  } catch (error) {
    showStatus(pageStatus, `Couldn't load the directory: ${error.message}`, 'error');
  }
}

searchInput.addEventListener('input', render);
// A narrower window wraps descriptions onto more lines, so recheck which ones are cut off.
new ResizeObserver(() => updateDescriptionToggles(listContainer)).observe(listContainer);
loadListings();
