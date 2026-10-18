// Small, chainable validator for request bodies.
// Each method checks one field, stores a cleaned value, and records a friendly
// error message if the value is invalid. Call `result()` at the end.
import { HttpError } from '../lib/httpError.js';
import { isPhotoKey } from '../lib/photos.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PHONE_PATTERN = /^[0-9+().\-\s]*(ext\.?\s*\d+)?$/i;

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** "2026-10-14" that names a real day (not "2026-02-30"). */
function isCalendarDate(text) {
  const match = DATE_PATTERN.exec(text);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isWebUrl(text) {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export class FieldValidator {
  constructor(body) {
    this.body = body || {};
    this.values = {};
    this.errors = {};
  }

  requiredText(field, label, maxLength) {
    const text = toTrimmedString(this.body[field]);
    if (!text) return this.fail(field, `${label} is required.`);
    return this.text(field, label, maxLength);
  }

  text(field, label, maxLength) {
    const text = toTrimmedString(this.body[field]);
    if (text.length > maxLength) return this.fail(field, `${label} must be ${maxLength} characters or fewer.`);
    this.values[field] = text || null;
    return this;
  }

  email(field, label) {
    const text = toTrimmedString(this.body[field]);
    if (!EMAIL_PATTERN.test(text) || text.length > 254) return this.fail(field, `${label} must be a valid email address.`);
    this.values[field] = text.toLowerCase();
    return this;
  }

  phone(field, label) {
    const text = toTrimmedString(this.body[field]);
    if (!PHONE_PATTERN.test(text) || text.length > 40) return this.fail(field, `${label} can only contain numbers and + ( ) - .`);
    this.values[field] = text || null;
    return this;
  }

  url(field, label) {
    const text = toTrimmedString(this.body[field]);
    if (text && (!isWebUrl(text) || text.length > 500)) return this.fail(field, `${label} must be a full link starting with https://`);
    this.values[field] = text || null;
    return this;
  }

  /** Accepts an array or newline-separated text of links. Stores an array. */
  urlList(field, label, maxCount) {
    const raw = this.body[field];
    const lines = (Array.isArray(raw) ? raw : String(raw || '').split('\n'))
      .map(toTrimmedString)
      .filter(Boolean);

    if (lines.length > maxCount) return this.fail(field, `${label}: please list ${maxCount} links or fewer.`);
    const invalid = lines.find((line) => !isWebUrl(line) || line.length > 500);
    if (invalid) return this.fail(field, `${label}: "${invalid.slice(0, 60)}" is not a full link starting with https://`);
    this.values[field] = lines;
    return this;
  }

  /**
   * Photos, in order: { keep: key } for one already saved, { upload: base64 } for a new one.
   * Stores [{ keep }, { upload: Buffer }]. Left out entirely when the form sent no `photos`,
   * so the post's photos stay as they are.
   */
  photoList(field, { maxCount, maxBytes, allowKeep }) {
    const raw = this.body[field];
    if (raw === undefined) return this;
    if (!Array.isArray(raw)) return this.fail(field, 'Photos could not be read. Please try again.');
    if (raw.length > maxCount) return this.fail(field, `Please add ${maxCount} photos or fewer.`);

    const photos = [];
    for (const entry of raw) {
      if (allowKeep && isPhotoKey(entry?.keep)) {
        photos.push({ keep: entry.keep });
        continue;
      }
      const upload = typeof entry?.upload === 'string' ? Buffer.from(entry.upload, 'base64') : null;
      if (!upload || upload.length === 0) return this.fail(field, 'Photos could not be read. Please try again.');
      if (upload.length > maxBytes) return this.fail(field, 'One of the photos is too large. Please choose a smaller one.');
      photos.push({ upload });
    }
    this.values[field] = photos;
    return this;
  }

  /**
   * A "2026-10-14" date, no earlier than `min` and no later than `max` (same format; either
   * may be left out). Blank is an error when `required`, otherwise the field is left out.
   */
  date(field, { min = '', max = '9999-12-31', required = false }, message) {
    const text = toTrimmedString(this.body[field]);
    if (!text) return required ? this.fail(field, message) : this;
    if (!isCalendarDate(text) || text < min || text > max) return this.fail(field, message);
    this.values[field] = text;
    return this;
  }

  /** The value must be exactly one of `allowed` (dropdowns and radio buttons). */
  oneOf(field, allowed, message) {
    const text = toTrimmedString(this.body[field]);
    if (!allowed.includes(text)) return this.fail(field, message);
    this.values[field] = text;
    return this;
  }

  mustBeTrue(field, message) {
    if (this.body[field] !== true && this.body[field] !== 'on') return this.fail(field, message);
    return this;
  }

  fail(field, message) {
    this.errors[field] = message;
    return this;
  }

  /** Returns the cleaned values, or throws a 400 error listing every invalid field. */
  result() {
    if (Object.keys(this.errors).length > 0) {
      throw new HttpError(400, 'Please fix the highlighted fields.', { fields: this.errors });
    }
    return this.values;
  }
}
