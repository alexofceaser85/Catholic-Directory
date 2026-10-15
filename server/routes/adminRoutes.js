// Admin API: every route requires a signed-in admin. Mounted at /api/admin.
import { Router } from 'express';
import * as dashboard from '../services/dashboardService.js';
import * as moderation from '../services/moderationService.js';
import { validateListingEdit, validateActionNote } from '../validation/listingValidation.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { requireJson } from '../middleware/requireJson.js';
import { parseId } from '../lib/parseId.js';
import { HttpError } from '../lib/httpError.js';

const LIST_STATUSES = ['pending', 'approved', 'denied', 'removed'];

const router = Router();
router.use(requireAdmin, requireJson);

// ---- Reading ---------------------------------------------------------------

router.get('/summary', async (req, res) => {
  res.json(await dashboard.getSummary());
});

router.get('/listings', async (req, res) => {
  const { status } = req.query;
  if (!LIST_STATUSES.includes(status)) {
    throw new HttpError(400, `status must be one of: ${LIST_STATUSES.join(', ')}`);
  }
  res.json(await dashboard.getListingsByStatus(status));
});

router.get('/listings/needs-reverification', async (req, res) => {
  res.json(await dashboard.getListingsNeedingReverification());
});

router.get('/listings/expired', async (req, res) => {
  res.json(await dashboard.getExpiredListings());
});

router.get('/edits', async (req, res) => {
  res.json(await dashboard.getEditRequests());
});

router.get('/listings/:id/history', async (req, res) => {
  res.json(await dashboard.getListingHistory(parseId(req.params.id)));
});

router.get('/reports', async (req, res) => {
  res.json(await dashboard.getOpenReports());
});

// ---- Changing --------------------------------------------------------------

router.put('/listings/:id', async (req, res) => {
  await moderation.edit(parseId(req.params.id), req.adminEmail, validateListingEdit(req.body));
  res.json({ ok: true });
});

/** Builds a handler for a button that acts on one item and accepts an optional { note }. */
function itemAction(action, what) {
  return async (req, res) => {
    const { note } = validateActionNote(req.body);
    await action(parseId(req.params.id, what), req.adminEmail, note);
    res.json({ ok: true });
  };
}

const listingAction = (action) => itemAction(action, 'Listing');

router.post('/listings/:id/approve', listingAction(moderation.approve));
router.post('/listings/:id/deny', listingAction(moderation.deny));
router.post('/listings/:id/remove', listingAction(moderation.remove));
router.post('/listings/:id/reverify', listingAction(moderation.reverify));
router.post('/listings/:id/check-in', listingAction(moderation.sendCheckIn));

router.post('/edits/:id/approve', itemAction(moderation.approveEdit, 'Edit request'));
router.post('/edits/:id/reject', itemAction(moderation.rejectEdit, 'Edit request'));

router.post('/reports/:id/dismiss', async (req, res) => {
  await moderation.dismissReport(parseId(req.params.id, 'Report'), req.adminEmail);
  res.json({ ok: true });
});

export default router;
