// The emails posters receive. Each one carries their private "manage your post" link.
// Emails never include the submitter's name: they go to the post's public contact address.
import config from '../config.js';
import { sendEmail } from '../lib/mailer.js';
import { chosenDuration, durationLabel, findPostTypeById } from '../../public/js/post-options.js';
import { isReverifiedType } from '../lib/shelfLife.js';

const SITE_NAME = 'Catholic Business Directory';

const LINK_WARNING =
  'This link is private: anyone who has it can change or remove your post, so please don\'t share it.';

/** The token goes after "#", so it never reaches the server's logs or other sites. */
export function manageUrl(token) {
  return `${config.publicUrl}/manage#token=${token}`;
}

/**
 * Sends in the background: a slow or failed email must never hold up or undo a submission
 * or an admin action. Failures are logged.
 */
function sendSafely(message) {
  sendEmail(message).catch((error) => {
    console.error(`Could not send email to ${message.to}:`, error.message);
  });
}

function shelfLifeSentence(postTypeId, durationDays) {
  const days = chosenDuration(findPostTypeById(postTypeId), durationDays);
  return days === null
    ? "Business listings stay up; we'll check in every few months to make sure the details are still right."
    : `It will show for ${durationLabel(days)} after it's approved. You can renew or remove it from the link below.`;
}

/** @param {{ title: string, email: string, postType: string, durationDays?: number }} post  postType is the database id. */
export function buildWelcomeEmail(post, token) {
  return {
    to: post.email,
    subject: `We got your post: ${post.title}`,
    text: [
      'Hello,',
      '',
      `Thank you for posting "${post.title}" to the ${SITE_NAME}. An admin will review it soon.`,
      shelfLifeSentence(post.postType, post.durationDays),
      '',
      'Use this link any time to edit, renew or remove your post:',
      manageUrl(token),
      '',
      LINK_WARNING,
      '',
      `If you didn't post this, you can ignore this email.`,
    ].join('\n'),
  };
}

/** @param {{ post: object, token: string }[]} posts  Rows with title, plus a fresh token each. */
export function buildLinksEmail(email, posts) {
  const lines = posts.flatMap(({ post, token }) => [`${post.title}`, manageUrl(token), '']);
  return {
    to: email,
    subject: `Your links for the ${SITE_NAME}`,
    text: [
      'Hello,',
      '',
      'Here are fresh links to manage your posts. Any older links no longer work.',
      '',
      ...lines,
      LINK_WARNING,
      '',
      "If you didn't ask for this, you can ignore this email.",
    ].join('\n'),
  };
}

/** Sent by an admin: "is your business still current?" or "your post is about to expire". */
export function buildCheckInEmail(post, token) {
  const isBusiness = isReverifiedType(post.postType);
  const ask = isBusiness
    ? `We're checking that "${post.title}" is still up to date in the ${SITE_NAME}. ` +
      'Please open the link below and confirm it, edit what has changed, or remove it.'
    : `We're checking on your post "${post.title}" in the ${SITE_NAME}. ` +
      'If it\'s still needed, open the link below to renew it. If it\'s done, you can remove it there.';
  return {
    to: post.email,
    subject: isBusiness ? `Is your listing still current? ${post.title}` : `Still need this post? ${post.title}`,
    text: ['Hello,', '', ask, '', manageUrl(token), '', LINK_WARNING, '', 'Thank you!'].join('\n'),
  };
}

export const sendWelcomeEmail = (post, token) => sendSafely(buildWelcomeEmail(post, token));
export const sendLinksEmail = (email, posts) => sendSafely(buildLinksEmail(email, posts));
export const sendCheckInEmail = (post, token) => sendSafely(buildCheckInEmail(post, token));
