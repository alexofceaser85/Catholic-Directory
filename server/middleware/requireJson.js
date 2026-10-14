import { HttpError } from '../lib/httpError.js';

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Requires write requests (POST/PUT/DELETE) to be sent as JSON.
 * Plain HTML forms on other websites can't send JSON, so this is an extra
 * layer of CSRF protection on top of the SameSite cookie.
 */
export function requireJson(req, res, next) {
  if (!READ_METHODS.includes(req.method) && !req.is('application/json')) {
    throw new HttpError(415, 'Requests must be sent as JSON.');
  }
  next();
}
