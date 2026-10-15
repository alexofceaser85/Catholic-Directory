// Public API: no sign-in needed. Mounted at /api.
import { Router } from 'express';
import * as directory from '../services/directoryService.js';
import { validateSubmission, validateReport, isLikelyBot } from '../validation/listingValidation.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireJson } from '../middleware/requireJson.js';
import { parseId } from '../lib/parseId.js';

const ONE_HOUR = 60 * 60 * 1000;

const submissionLimit = rateLimit({
  windowMs: ONE_HOUR,
  max: 5,
  message: 'Too many submissions from your network. Please try again in an hour.',
});

const reportLimit = rateLimit({
  windowMs: ONE_HOUR,
  max: 10,
  message: 'Too many reports from your network. Please try again in an hour.',
});

const router = Router();
router.use(requireJson);

// Live listings for the public directory page.
router.get('/listings', async (req, res) => {
  res.json(await directory.getPublicListings());
});

// "Add a listing" request. Goes to the admin review queue; the poster is emailed their private link.
router.post('/listings', submissionLimit, async (req, res) => {
  if (!isLikelyBot(req.body)) {
    await directory.submitListing(validateSubmission(req.body));
  }
  // Bots get the same success response so they don't learn they were caught.
  res.status(201).json({ ok: true });
});

// "This listing is out of date" report.
router.post('/listings/:id/reports', reportLimit, async (req, res) => {
  const id = parseId(req.params.id);
  if (!isLikelyBot(req.body)) {
    const { reason } = validateReport(req.body);
    await directory.reportListing(id, reason);
  }
  res.status(201).json({ ok: true });
});

export default router;
