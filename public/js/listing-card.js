// Builds one listing card for the public directory.
import { el, externalLink, safeHref } from './dom.js';
import { formatDate, shortUrl } from './format.js';
import { findPostType } from './post-options.js';

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

/**
 * @param {object} listing  Listing from the published directory sheet (see listing-rows.js).
 * @param {(listing: object) => void} onReport  Called when "Report outdated info" is clicked.
 */
export function renderListingCard(listing, onReport) {
  return el('li', { class: `card listing-card type-${typeSlug(listing.postType)}` }, [
    tagsLine(listing),
    el('h2', { class: 'card-title' }, [listing.title]),
    el('p', { class: 'description' }, [listing.description]),
    contactSection(listing),
    linksSection(listing.links),
    el('div', { class: 'card-footer' }, [
      freshnessNote(listing),
      el('button', { type: 'button', class: 'link-button subtle small', onclick: () => onReport(listing) }, [
        'Report outdated info',
      ]),
    ]),
  ]);
}

/** Text used by the search box to match a listing. */
export function searchableText(listing) {
  return [listing.title, listing.category, listing.description, listing.address, listing.website, ...listing.links]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
