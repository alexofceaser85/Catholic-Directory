// Entry point for the public directory page (index.html):
// loads live listings, renders them, and filters as you type in the search box.
import { api } from './api.js';
import { showStatus } from './dom.js';
import { plural } from './format.js';
import { renderListingCard, searchableText } from './listing-card.js';
import { openReportDialog } from './report-dialog.js';

const listContainer = document.getElementById('listings');
const searchInput = document.getElementById('search');
const resultCount = document.getElementById('result-count');
const pageStatus = document.getElementById('page-status');

let allListings = [];

function matchesSearch(listing, words) {
  const text = searchableText(listing);
  return words.every((word) => text.includes(word));
}

function render() {
  const words = searchInput.value.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = allListings.filter((listing) => matchesSearch(listing, words));

  listContainer.replaceChildren(...visible.map((listing) => renderListingCard(listing, openReportDialog)));
  resultCount.textContent = plural(visible.length, 'business', 'businesses');

  if (allListings.length === 0) showStatus(pageStatus, 'No businesses are listed yet. Be the first to add yours!');
  else if (visible.length === 0) showStatus(pageStatus, 'No businesses match your search.');
  else showStatus(pageStatus, '');
}

async function loadListings() {
  showStatus(pageStatus, 'Loading businesses…');
  try {
    allListings = await api.get('/api/listings');
    render();
  } catch (error) {
    showStatus(pageStatus, `Couldn't load the directory: ${error.message}`, 'error');
  }
}

searchInput.addEventListener('input', render);
loadListings();
