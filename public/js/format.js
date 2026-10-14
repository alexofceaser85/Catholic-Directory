// Display formatting shared by the public and admin pages.

const dateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export function formatDate(isoString) {
  return isoString ? dateFormat.format(new Date(isoString)) : '—';
}

/** "website.com/page" instead of "https://www.website.com/page/" for cleaner link text. */
export function shortUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/** plural(1, 'day') -> "1 day", plural(2, 'business', 'businesses') -> "2 businesses" */
export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
