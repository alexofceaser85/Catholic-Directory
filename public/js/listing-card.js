// Builds one listing card for the public directory.
import { el, externalLink, safeHref } from './dom.js';
import { formatDate, shortUrl } from './format.js';
import { findPostType } from './post-options.js';
import { renderPhotoStrip } from './photo-strip.js';

/** Used for the card's color: "Help wanted" -> "help-wanted". */
function typeSlug(postType) {
  return postType.toLowerCase().replace(/[^a-z]+/g, '-');
}

/** Post type badge plus category, above the title. */
function tagsLine(listing) {
  return el('p', { class: 'card-tags' }, [
    el('span', { class: `badge type-badge type-${typeSlug(listing.postType)}` }, [listing.postType]),
    listing.category && el('span', { class: 'category' }, [listing.category]),
  ]);
}

/** Businesses show when they were last checked. Posts with a shelf life show until when they run. */
function freshnessNote(listing) {
  if (findPostType(listing.postType).expiresAfterDays === null) {
    return listing.lastVerified ? el('span', { class: 'verified' }, [`✓ Verified ${formatDate(listing.lastVerified)}`]) : el('span');
  }
  return listing.expires ? el('span', { class: 'muted small' }, [`Listed until ${formatDate(listing.expires)}`]) : el('span');
}

function contactLine(label, node) {
  return el('p', { class: 'contact-line' }, [el('span', { class: 'contact-label' }, [label]), node]);
}

function contactSection(listing) {
  const telHref = listing.phone ? `tel:${listing.phone.replace(/[^\d+]/g, '')}` : null;
  return el('div', { class: 'contact' }, [
    contactLine('Email', el('a', { href: `mailto:${listing.email}` }, [listing.email])),
    listing.phone && contactLine('Phone', el('a', { href: telHref }, [listing.phone])),
    listing.address && contactLine('Address', el('span', {}, [listing.address])),
    listing.website && safeHref(listing.website) && contactLine('Website', externalLink(listing.website, shortUrl(listing.website))),
  ]);
}

function linksSection(links) {
  if (links.length === 0) return null;
  return el('ul', { class: 'link-list' }, links.map((url) => el('li', {}, [externalLink(url, shortUrl(url))])));
}

let descriptionCount = 0;

/**
 * The description starts clamped to a few lines, with a "Show more" button to open it.
 * updateDescriptionToggles() hides the button again when the text already fits.
 */
function descriptionSection(description) {
  const id = `description-${++descriptionCount}`;
  const text = el('p', { class: 'description is-collapsed', id }, [description]);
  const toggle = el('button', { type: 'button', class: 'description-toggle', 'aria-expanded': 'false', 'aria-controls': id }, ['Show more']);
  toggle.addEventListener('click', () => {
    const expanding = toggle.getAttribute('aria-expanded') === 'false';
    text.classList.toggle('is-collapsed', !expanding);
    toggle.setAttribute('aria-expanded', String(expanding));
    toggle.textContent = expanding ? 'Show less' : 'Show more';
  });
  return el('div', { class: 'description-block' }, [text, toggle]);
}

/**
 * @param {object} listing  Listing from GET /api/listings (see listingPresenter.js).
 * @param {(listing: object) => void} onReport  Called when "Report outdated info" is clicked.
 */
export function renderListingCard(listing, onReport) {
  return el('li', { class: `card listing-card type-${typeSlug(listing.postType)}` }, [
    el('div', { class: 'listing-main' }, [
      tagsLine(listing),
      el('h2', { class: 'card-title' }, [listing.title]),
      descriptionSection(listing.description),
      renderPhotoStrip(listing.photos, listing.title),
      linksSection(listing.links),
    ]),
    contactSection(listing),
    el('div', { class: 'card-footer' }, [
      freshnessNote(listing),
      el('button', { type: 'button', class: 'link-button subtle small', onclick: () => onReport(listing) }, [
        'Report outdated info',
      ]),
    ]),
  ]);
}

/**
 * Shows "Show more" only on collapsed descriptions that are actually cut off.
 * Call after the cards are on the page, and again when the width changes.
 */
export function updateDescriptionToggles(container) {
  for (const toggle of container.querySelectorAll('.description-toggle[aria-expanded="false"]')) {
    const text = document.getElementById(toggle.getAttribute('aria-controls'));
    toggle.hidden = text.scrollHeight <= text.clientHeight + 1;
  }
}

/** Text used by the search box to match a listing. */
export function searchableText(listing) {
  return [listing.title, listing.category, listing.description, listing.address, listing.website, ...listing.links]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
