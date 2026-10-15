// Admin sign-in and sign-out. Mounted at /api/auth.
import { Router } from 'express';
import config from '../config.js';
import { verifyGoogleCredential } from '../auth/googleSignIn.js';
import { startSession, endSession, getAdminEmail, isAdminEmail } from '../auth/adminSession.js';
import { requireJson } from '../middleware/requireJson.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { HttpError } from '../lib/httpError.js';

const signInLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many sign-in attempts. Please wait a few minutes.',
});

const router = Router();
router.use(requireJson);

function signInAsAdmin(res, email) {
  if (!isAdminEmail(email)) {
    throw new HttpError(403, `${email} is not on the admin list. Ask an admin to add you.`);
  }
  startSession(res, email);
  res.json({ email });
}

// What the admin login page needs to render its buttons.
router.get('/config', (req, res) => {
  res.json({ googleClientId: config.googleClientId, devLogin: config.devAdminLogin });
});

// Who is signed in right now. { email: null } when nobody is.
router.get('/me', (req, res) => {
  res.json({ email: getAdminEmail(req) });
});

router.post('/google', signInLimit, async (req, res) => {
  const email = await verifyGoogleCredential(req.body?.credential);
  signInAsAdmin(res, email);
});

// Local development only: sign in by typing an allowlisted email. Disabled in production.
router.post('/dev-login', signInLimit, (req, res) => {
  if (!config.devAdminLogin) throw new HttpError(404, 'Not found.');
  signInAsAdmin(res, String(req.body?.email || '').trim().toLowerCase());
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.json({ ok: true });
});

export default router;
