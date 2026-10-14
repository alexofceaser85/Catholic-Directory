// Simple in-memory rate limiter: at most `max` requests per IP address per `windowMs`.
// Good enough for a single server. Counters reset when the server restarts.
import { HttpError } from '../lib/httpError.js';

export function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  function removeExpired(now) {
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    removeExpired(now);

    const entry = hits.get(req.ip) || { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    hits.set(req.ip, entry);

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      throw new HttpError(429, message);
    }
    next();
  };
}
