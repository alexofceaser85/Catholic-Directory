import { getAdminEmail } from '../auth/adminSession.js';
import { HttpError } from '../lib/httpError.js';

/** Blocks the request unless an allowlisted admin is signed in. Sets req.adminEmail. */
export function requireAdmin(req, res, next) {
  const email = getAdminEmail(req);
  if (!email) {
    throw new HttpError(401, 'Please sign in as an admin.');
  }
  req.adminEmail = email;
  next();
}
