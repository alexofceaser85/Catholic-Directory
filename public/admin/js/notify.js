// One place to show messages above the dashboard list (loading, errors, "saved").
import { showStatus } from '/js/dom.js';

const panelStatus = document.getElementById('panel-status');

export function notify(message, kind = 'info') {
  showStatus(panelStatus, message, kind);
  if (message && kind === 'error') panelStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function clearNotice() {
  showStatus(panelStatus, '');
}
