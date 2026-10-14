// Helpers for building page elements safely.
// Text is always added with textContent (never innerHTML), so anything a visitor
// typed into a form is displayed as plain text and can't inject HTML or scripts.

/**
 * Creates an element.
 *   el('a', { class: 'link', href: '/x', onclick: fn }, ['Click me'])
 * Strings in `children` become text; null/false children are skipped.
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...[].concat(children).filter((child) => child !== null && child !== false && child !== undefined));
  return node;
}

/** Only allows http(s) links, so a submitted "javascript:..." link can never be clicked. */
export function safeHref(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/** A link that opens in a new tab, or plain text if the URL isn't a safe web link. */
export function externalLink(url, text = url) {
  const href = safeHref(url);
  if (!href) return document.createTextNode(text);
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer nofollow' }, [text]);
}

/** Shows `message` in a status element (role="status" so screen readers announce it). */
export function showStatus(node, message, kind = 'info') {
  node.textContent = message;
  node.dataset.kind = kind;
  node.hidden = !message;
}
