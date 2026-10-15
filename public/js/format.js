// Display formatting shared by the pages.

const dateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/** "2026-10-14" -> "Oct 14, 2026". Built as a local date so it never shifts a day by time zone. */
export function formatDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || '');
  if (!match) return isoDate || '—';
  const [, year, month, day] = match.map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

/** "website.com/page" instead of "https://www.website.com/page/" for cleaner link text. */
export function shortUrl(url) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/** plural(1, 'day') -> "1 day", plural(2, 'business', 'businesses') -> "2 businesses" */
export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
