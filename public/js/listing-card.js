// Builds one business card for the public directory.
import { el, externalLink, safeHref } from './dom.js';
import { formatDate, shortUrl } from './format.js';

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
 * @param {object} listing  Public listing from GET /api/listings.
 * @param {(listing: object) => void} onReport  Called when "Report outdated info" is clicked.
 */
export function renderListingCard(listing, onReport) {
  return el('li', { class: 'card listing-card' }, [
    el('h2', { class: 'card-title' }, [listing.businessName]),
    el('p', { class: 'description' }, [listing.description]),
    contactSection(listing),
    linksSection(listing.links),
    el('div', { class: 'card-footer' }, [
      el('span', { class: 'verified' }, [`✓ Verified ${formatDate(listing.lastVerifiedAt)}`]),
      el('button', { type: 'button', class: 'link-button subtle small', onclick: () => onReport(listing) }, [
        'Report outdated info',
      ]),
    ]),
  ]);
}

/** Text used by the search box to match a listing. */
export function searchableText(listing) {
  return [listing.businessName, listing.description, listing.address, listing.website, ...listing.links]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
