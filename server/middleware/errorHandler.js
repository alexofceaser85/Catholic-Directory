import { HttpError } from '../lib/httpError.js';

/** Unknown /api/* routes get a JSON 404 instead of an HTML page. */
export function apiNotFound(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

/**
 * Turns thrown errors into JSON responses.
 * HttpErrors are expected (bad input, not signed in...) and their message is shown to the user.
 * Anything else is a bug: log it and return a generic message so no internals leak.
 */
// Express recognizes error handlers by their four arguments, so `next` must stay even though it's unused.
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, ...error.details });
    return;
  }
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON.' });
    return;
  }
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request is too large.' });
    return;
  }
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
