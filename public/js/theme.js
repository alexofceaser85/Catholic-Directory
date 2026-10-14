// Light / dark mode. Loaded as a plain (non-module) script in <head> so the saved
// choice is applied before the page is drawn, which avoids a flash of the wrong colors.
// With no saved choice, the page follows the device's setting (see styles.css).
(function () {
  const STORAGE_KEY = 'clm-theme';
  const root = document.documentElement;
  const deviceDark = window.matchMedia('(prefers-color-scheme: dark)');

  // Storage can be blocked (private windows, strict settings), so never let it break the page.
  function loadChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function saveChoice(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* choice just isn't remembered */ }
  }

  function currentTheme() {
    return root.dataset.theme || (deviceDark.matches ? 'dark' : 'light');
  }

  function updateButton(button) {
    const isDark = currentTheme() === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function setUpToggle() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    updateButton(button);
    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      saveChoice(next);
      updateButton(button);
    });
    deviceDark.addEventListener('change', () => updateButton(button));
  }

  const saved = loadChoice();
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  document.addEventListener('DOMContentLoaded', setUpToggle);
})();
