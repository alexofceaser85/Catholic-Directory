// A poster managing their own post through their private link. Mounted at /api/manage.
// Every request carries the link's token in the JSON body (never in the URL), so it
// doesn't end up in server logs or browser history.
import { Router } from 'express';
import * as posters from '../services/posterService.js';
import { validateManageToken, validatePosterEdit, validateEmailRequest, isLikelyBot } from '../validation/listingValidation.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireJson } from '../middleware/requireJson.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Tokens can't be guessed, but this still stops anyone from hammering the endpoints.
const manageLimit = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 60,
  message: 'Too many requests. Please wait a few minutes and try again.',
});

const linkRequestLimit = rateLimit({
  windowMs: ONE_HOUR,
  max: 5,
  message: 'Too many link requests from your network. Please try again in an hour.',
});

const router = Router();
router.use(requireJson);

// POST, not GET, so the token travels in the body.
router.post('/post', manageLimit, async (req, res) => {
  res.json(await posters.getOwnPost(validateManageToken(req.body)));
});

router.post('/edit', manageLimit, async (req, res) => {
  const token = validateManageToken(req.body);
  res.json(await posters.editOwnPost(token, validatePosterEdit(req.body)));
});

router.post('/renew', manageLimit, async (req, res) => {
  await posters.renewOwnPost(validateManageToken(req.body));
  res.json({ ok: true });
});

router.post('/remove', manageLimit, async (req, res) => {
  await posters.removeOwnPost(validateManageToken(req.body));
  res.json({ ok: true });
});

// "Email me my links". Always the same answer, whether or not the email has posts.
router.post('/send-links', linkRequestLimit, async (req, res) => {
  if (!isLikelyBot(req.body)) {
    const { email } = validateEmailRequest(req.body);
    await posters.sendFreshLinks(email);
  }
  res.json({ ok: true });
});

export default router;
