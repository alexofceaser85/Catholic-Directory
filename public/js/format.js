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

/**
 * US numbers as "404-555-1234" (a leading country code 1 is dropped).
 * Anything else, like an extension or a foreign number, is shown as typed.
 */
export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
