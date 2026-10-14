// Builds a pre-written reverification email the admin can send from their own mail app.
import { el } from '/js/dom.js';

function reverificationEmailBody(listing) {
  const details = [
    `Business: ${listing.businessName}`,
    `Email: ${listing.email}`,
    listing.phone && `Phone: ${listing.phone}`,
    listing.address && `Address: ${listing.address}`,
    listing.website && `Website: ${listing.website}`,
    `Description: ${listing.description}`,
  ].filter(Boolean);

  return [
    'Hello,',
    '',
    "We're checking that listings in the CLM Business Directory are still up to date.",
    'Could you confirm the details below are correct, or reply with anything that has changed?',
    '',
    ...details,
    '',
    "If we don't hear back, the listing may be removed from the directory.",
    '',
    'Thank you!',
  ].join('\n');
}

export function reverificationMailto(listing) {
  const subject = `Please confirm your CLM Directory listing: ${listing.businessName}`;
  return `mailto:${listing.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    reverificationEmailBody(listing),
  )}`;
}

/** "Email business" button that opens a pre-filled reverification email. */
export function contactButton(listing) {
  return el('a', { class: 'button secondary small', href: reverificationMailto(listing) }, ['✉ Email business']);
}
