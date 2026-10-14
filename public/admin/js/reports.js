// The "open reports" box shown on a card in the Reports tab.
import { api } from '/js/api.js';
import { el } from '/js/dom.js';
import { formatDate, plural } from '/js/format.js';
import { confirmAction } from './action-dialog.js';
import { notify } from './notify.js';

async function dismissReport(report, onChange) {
  const choice = await confirmAction({
    heading: 'Dismiss this report?',
    text: 'Use this when the report is wrong. The listing stays live and its counter is not reset.',
    confirmLabel: 'Dismiss report',
  });
  if (!choice) return;

  try {
    await api.post(`/api/admin/reports/${report.id}/dismiss`);
    onChange();
  } catch (error) {
    notify(error.message, 'error');
  }
}

function reportItem(report, onChange) {
  return el('li', { class: 'report-item' }, [
    el('span', {}, [`“${report.reason}” `, el('span', { class: 'small' }, [`— ${formatDate(report.createdAt)}`])]),
    el('button', { type: 'button', class: 'link-button small', onclick: () => dismissReport(report, onChange) }, [
      'Dismiss',
    ]),
  ]);
}

/** Returns null when there are no reports, so the card simply skips this section. */
export function renderReports(reports, onChange) {
  if (reports.length === 0) return null;
  return el('div', { class: 'callout danger' }, [
    el('strong', {}, [`${plural(reports.length, 'open report')}:`]),
    el('ul', { class: 'report-list' }, reports.map((report) => reportItem(report, onChange))),
  ]);
}
