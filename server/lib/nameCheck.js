// Flags public fields that contain the submitter's first or last name.
// This is the website version of the "Name check" column from the Google Sheet:
// a helper for the admin, not a guarantee.

const MIN_NAME_LENGTH = 2;

const PUBLIC_FIELDS = {
  businessName: 'Business name',
  email: 'Email',
  address: 'Address',
  description: 'Description',
  website: 'Website',
  links: 'Links',
};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when `name` appears in `text` as a whole word (so "Al" does not match "Albany"). */
function containsWord(text, name) {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(name)}($|[^a-z0-9])`, 'i');
  return pattern.test(text);
}

/** Emails often glue names together ("jsmith@", "janesmith@"), so check the part before @ loosely. */
function emailContainsName(email, name) {
  const localPart = email.split('@')[0].toLowerCase();
  return name.length >= 3 && localPart.includes(name);
}

function fieldText(listing, field) {
  const value = listing[field];
  return Array.isArray(value) ? value.join(' ') : value || '';
}

/**
 * @param {object} listing A listing with submitterFirstName, submitterLastName and public fields.
 * @returns {string[]} Labels of the fields that contain the submitter's name, e.g. ["Email", "Description"].
 */
export function findNameMatches(listing) {
  const names = [listing.submitterFirstName, listing.submitterLastName]
    .map((name) => (name || '').trim().toLowerCase())
    .filter((name) => name.length >= MIN_NAME_LENGTH);

  return Object.entries(PUBLIC_FIELDS)
    .filter(([field]) => {
      const text = fieldText(listing, field);
      return names.some(
        (name) => containsWord(text, name) || (field === 'email' && emailContainsName(text, name)),
      );
    })
    .map(([, label]) => label);
}
