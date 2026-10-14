// The signed-in dashboard: tab bar with counts, and the list for the selected tab.
import { api } from '/js/api.js';
import { el } from '/js/dom.js';
import { TABS } from './tabs.js';
import { renderAdminCard } from './admin-card.js';
import { notify, clearNotice } from './notify.js';

const dashboardView = document.getElementById('dashboard-view');
const tabsNav = document.getElementById('tabs');
const tabDescription = document.getElementById('tab-description');
const panel = document.getElementById('panel');

let activeTab = TABS[0];
let summary = { reverifyAfterDays: 90 };
let latestRequest = 0; // Ignores slow responses from a tab the admin already left.

function handleLoadError(error) {
  if (error.status === 401) {
    window.location.reload(); // Session expired: back to the sign-in screen.
    return;
  }
  notify(`Couldn't load data: ${error.message}`, 'error');
}

function renderTabs() {
  tabsNav.setAttribute('role', 'tablist');
  tabsNav.replaceChildren(
    ...TABS.map((tab) =>
      el('button', { type: 'button', class: 'tab', role: 'tab', 'data-tab': tab.id, onclick: () => selectTab(tab) }, [
        tab.label,
        el('span', { class: 'count badge neutral', 'data-count-for': tab.id }, ['…']),
      ]),
    ),
  );
}

function markActiveTab() {
  tabsNav.querySelectorAll('[data-tab]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.tab === activeTab.id));
  });
  tabDescription.textContent = activeTab.description(summary);
}

function renderCounts() {
  for (const tab of TABS) {
    const count = summary[tab.countKey] ?? 0;
    const badge = tabsNav.querySelector(`[data-count-for="${tab.id}"]`);
    badge.textContent = String(count);
    badge.className = `count badge ${tab.needsAction && count > 0 ? 'warning' : 'neutral'}`;
  }
}

function renderItem(item) {
  const onChange = refresh;
  return activeTab.grouped
    ? renderAdminCard(item.listing, { reports: item.reports, onChange })
    : renderAdminCard(item, { onChange });
}

async function loadSummary() {
  summary = await api.get('/api/admin/summary');
  renderCounts();
  markActiveTab();
}

async function loadPanel() {
  const requestId = ++latestRequest;
  const tab = activeTab;
  notify('Loading…');
  const items = await api.get(tab.url);
  if (requestId !== latestRequest) return;

  panel.replaceChildren(...items.map(renderItem));
  if (items.length === 0) notify(tab.empty);
  else clearNotice();
}

function selectTab(tab) {
  activeTab = tab;
  markActiveTab();
  panel.replaceChildren();
  loadPanel().catch(handleLoadError);
}

/** Reloads the counts and the current tab. Called after every admin action. */
export async function refresh() {
  try {
    await Promise.all([loadSummary(), loadPanel()]);
  } catch (error) {
    handleLoadError(error);
  }
}

export function startDashboard() {
  dashboardView.hidden = false;
  renderTabs();
  markActiveTab();
  refresh();
}
