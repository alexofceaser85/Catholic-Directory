// What people can post and the categories they can pick.
// The one list for the whole app: the browser loads this file, and the server imports it
// too (validation, shelf life), so the two can never disagree.

export const BUSINESS = 'Business';

/**
 * id                Stored in the database (listings.post_type). Never change it once posts exist.
 * label             Shown on the site and sent by the forms. Safe to reword.
 * expiresAfterDays  null = stays listed (businesses get rechecked every 90 days instead).
 *                   Otherwise the longest a post shows, and the default.
 * durationChoices   How long the poster can ask for it to show, in days (the last is expiresAfterDays).
 * titleLabel / titlePlaceholder / summary  Wording for the submit form.
 */
export const POST_TYPES = [
  {
    id: 'business',
    label: BUSINESS,
    filterLabel: 'Businesses',
    expiresAfterDays: null,
    summary: 'A farm, homestead, shop or small business. Stays listed; we check in every 90 days.',
    titleLabel: 'Business name',
    titlePlaceholder: 'e.g. Sweetwater Creek Farm',
  },
  {
    id: 'offering_services',
    label: 'Offering services',
    filterLabel: 'Services offered',
    expiresAfterDays: 60,
    durationChoices: [14, 30, 60],
    summary: 'You have a skill or trade and are looking for work: fencing, carpentry, butchering, tutoring… Shows for up to 60 days.',
    titleLabel: 'What you offer',
    titlePlaceholder: 'e.g. Fence building and repair',
  },
  {
    id: 'help_wanted',
    label: 'Help wanted',
    filterLabel: 'Help wanted',
    expiresAfterDays: 30,
    durationChoices: [7, 14, 30],
    summary: 'You need a hand: farm help, a harvest crew, a tradesperson, a tutor… Shows for up to 30 days.',
    titleLabel: 'What you need',
    titlePlaceholder: 'e.g. Farmhand for fall harvest, 2 days a week',
  },
];

export const CATEGORIES = [
  'Farm & livestock',
  'Food & produce',
  'Trades & construction',
  'Home & garden',
  'Crafts & handmade',
  'Education & homeschool',
  'Health & wellness',
  'Professional services',
  'Other',
];

/** The post type with this label. Blank or unknown labels count as a business. */
export function findPostType(label) {
  return POST_TYPES.find((type) => type.label === label) ?? POST_TYPES[0];
}

/**
 * How many days a post shows: the poster's choice when it's one of the type's options,
 * otherwise the type's default. null for types that don't expire (businesses).
 */
export function chosenDuration(postType, requestedDays) {
  const days = Number(requestedDays);
  if (postType.expiresAfterDays === null) return null;
  return postType.durationChoices?.includes(days) ? days : postType.expiresAfterDays;
}

/** "7 days" -> "1 week", "14" -> "2 weeks", "30" -> "30 days". */
export function durationLabel(days) {
  if (days % 7 === 0 && days <= 21) return days === 7 ? '1 week' : `${days / 7} weeks`;
  return `${days} days`;
}

/** The post type stored in the database under this id. */
export function findPostTypeById(id) {
  return POST_TYPES.find((type) => type.id === id) ?? POST_TYPES[0];
}

/** "2026-10-14" for the given day, in local time (not UTC, which can be a day off in the evening). */
export function isoDate(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * True when a post's shelf life is over. The server already leaves these out of the public
 * list; the admin dashboard uses this to label them. A post still shows on its Expires date
 * and is hidden from the day after.
 */
export function isExpired(listing, today = new Date()) {
  if (findPostType(listing.postType).expiresAfterDays === null) return false;
  return Boolean(listing.expires) && listing.expires < isoDate(today);
}
