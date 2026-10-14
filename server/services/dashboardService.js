// Read-only queries that feed the admin dashboard tabs.
import config from '../config.js';
import * as listings from '../repositories/listingRepository.js';
import * as reports from '../repositories/reportRepository.js';
import * as adminActions from '../repositories/adminActionRepository.js';
import {
  toAdminListing,
  toAdminAction,
  groupReportsByListing,
} from '../presenters/listingPresenter.js';
import { notFound } from '../lib/httpError.js';

/** Badge counts for every tab. */
export async function getSummary() {
  const byStatus = await listings.countByStatus();
  return {
    pending: byStatus.pending || 0,
    approved: byStatus.approved || 0,
    denied: byStatus.denied || 0,
    removed: byStatus.removed || 0,
    needsReverification: await listings.countNeedingReverification(config.reverifyAfterDays),
    openReports: await reports.countOpen(),
    reverifyAfterDays: config.reverifyAfterDays,
  };
}

export async function getListingsByStatus(status) {
  const rows = await listings.findByStatus(status);
  return rows.map(toAdminListing);
}

export async function getListingsNeedingReverification() {
  const rows = await listings.findNeedingReverification(config.reverifyAfterDays);
  return rows.map(toAdminListing);
}

/** Open reports grouped by listing, so a listing reported 3 times shows once. */
export async function getOpenReports() {
  const reportRows = await reports.findOpen();
  const listingIds = [...new Set(reportRows.map((report) => report.listing_id))];
  const listingRows = await listings.findByIds(listingIds);
  return groupReportsByListing(reportRows, listingRows);
}

export async function getListingHistory(id) {
  const listing = await listings.findById(id);
  if (!listing) throw notFound();
  const rows = await adminActions.findForListing(id);
  return rows.map(toAdminAction);
}
