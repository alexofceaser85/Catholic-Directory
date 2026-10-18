// The top card on the "Manage your post" page: where the post stands, plus the
// Renew / Confirm and Remove buttons.
import { el } from './dom.js';
import { formatDate } from './format.js';
import { findPostType } from './post-options.js';

const STATUS = {
  pending: ['Waiting for review', 'warning', 'An admin will look at it soon. You can still edit it below.'],
  approved: ['Live', 'success', 'It is showing in the directory.'],
  removed: ['Removed', 'neutral', "It's no longer in the directory."],
};

function statusLine(post) {
  if (post.isExpired) {
    return [el('span', { class: 'badge danger' }, ['Expired']), ` It stopped showing after ${formatDate(post.expires)}. Renew it to bring it back.`];
  }
  const [label, kind, text] = STATUS[post.status];
  return [el('span', { class: `badge ${kind}` }, [label]), ` ${text}`];
}

/** "Shows until …" for posts that expire, "Last confirmed …" for businesses. */
function shelfLifeLine(post) {
  if (post.status !== 'approved' || post.isExpired) return null;
  const isBusiness = !findPostType(post.postType).expires;
  if (isBusiness) return el('p', { class: 'muted small' }, [`Last confirmed ${formatDate(post.lastVerified)}.`]);
  return el('p', { class: 'muted small' }, [`Shows until ${formatDate(post.expires)}.`]);
}

function pendingEditNotice(post) {
  if (!post.pendingEdit) return null;
  return el('p', { class: 'callout-note' }, [
    `Your changes from ${formatDate(post.pendingEdit.submittedAt)} are waiting for an admin. `,
    'The form below shows them; the directory shows the current version until they are approved.',
  ]);
}

function renewLabel(post) {
  return findPostType(post.postType).expires ? `Renew for ${post.renewDays} days` : 'Confirm it\'s still current';
}

/**
 * @param {HTMLElement} container
 * @param {object} post  From POST /api/manage/post.
 * @param {{ onRenew: () => void, onRemove: () => void }} actions
 */
export function renderSummary(container, post, { onRenew, onRemove }) {
  const canRenew = post.status === 'approved';
  const canRemove = post.status === 'pending' || post.status === 'approved';
  const parts = [
    el('p', { class: 'card-tags' }, [el('span', { class: 'badge neutral' }, [post.postType]), post.category]),
    el('h2', { class: 'card-title' }, [post.title]),
    el('p', {}, statusLine(post)),
    shelfLifeLine(post),
    pendingEditNotice(post),
    el('div', { class: 'manage-actions' }, [
      canRenew && el('button', { type: 'button', class: 'button', onclick: onRenew }, [renewLabel(post)]),
      canRemove && el('button', { type: 'button', class: 'button secondary', onclick: onRemove }, ['Remove post']),
    ]),
  ];
  // replaceChildren() would print a skipped (null) section as the text "null".
  container.replaceChildren(...parts.filter(Boolean));
}
