import { notFound } from './httpError.js';

/** Converts a URL id like "42" to a number, or throws 404 for anything that isn't a positive integer. */
export function parseId(value, what) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw notFound(what);
  }
  return id;
}
