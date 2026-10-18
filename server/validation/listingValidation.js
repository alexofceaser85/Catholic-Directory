// The rules for each form in the app. Field names match the HTML form `name` attributes.
import { FieldValidator } from './FieldValidator.js';
import { HttpError } from '../lib/httpError.js';
import { isWellFormedToken } from '../lib/manageToken.js';
import config from '../config.js';
import {
  CATEGORIES, POST_TYPES, UNTIL_DATE, addDays, chosenDuration, findPostType, isoDate,
} from '../../public/js/post-options.js';
import { MAX_PHOTOS, MAX_UPLOAD_BYTES } from '../../public/js/photo-rules.js';

const MAX_LINKS = 10;
const POST_TYPE_LABELS = POST_TYPES.map((type) => type.label);

/** The fields shown on the public directory. Posters and admins can both edit these. */
function checkPublicFields(validator, { isNewPost = false } = {}) {
  return validator
    .requiredText('title', 'Title', 200)
    .oneOf('category', CATEGORIES, 'Please choose a category.')
    .email('email', 'Contact email')
    .phone('phone', 'Phone')
    .text('address', 'Address', 500)
    .requiredText('parish', 'Parish', 200)
    .requiredText('description', 'Description', 2000)
    .url('website', 'Website')
    .urlList('links', 'Links', MAX_LINKS)
    // A new post has no saved photos yet, so it can only upload.
    .photoList('photos', { maxCount: MAX_PHOTOS, maxBytes: MAX_UPLOAD_BYTES, allowKeep: !isNewPost });
}

/** The forms send the post type's label ("Help wanted"); the database stores its id ("help_wanted"). */
function withPostTypeId(values) {
  return { ...values, postType: findPostType(values.postType).id };
}

/**
 * "How long should it show?": one of the lengths (counted from approval), or a last day the
 * poster picks within MAX_POST_DAYS. The lengths are a dropdown, so any other number can only
 * come from a tampered request: it quietly becomes the longest. Businesses get neither.
 * Returns { durationDays }; a picked date is checked by the validator and saved as `expires`.
 */
function checkDuration(validator, body) {
  const type = findPostType(body.postType);
  const maxDays = config.maxPostDays;
  if (type.expires && body.durationDays === UNTIL_DATE) {
    const today = isoDate(new Date());
    validator.date('expires', { min: today, max: addDays(today, maxDays), required: true },
      `Please pick a date in the next ${maxDays} days.`);
    return { durationDays: null };
  }
  return { durationDays: chosenDuration(type, body.durationDays, maxDays) };
}

/** Public "Add a listing" form. */
export function validateSubmission(body) {
  const validator = new FieldValidator(body)
    .oneOf('postType', POST_TYPE_LABELS, 'Please choose what you are posting.')
    .requiredText('submitterFirstName', 'First name', 100)
    .requiredText('submitterLastName', 'Last name', 100)
    .mustBeTrue('consent', 'Please confirm these details may be shown publicly.');
  const duration = checkDuration(validator, body);
  const values = checkPublicFields(validator, { isNewPost: true }).result();
  return withPostTypeId({ ...values, ...duration });
}

/** A poster editing their own post. They can't change the post type or their name. */
export function validatePosterEdit(body) {
  return checkPublicFields(new FieldValidator(body)).result();
}

/**
 * Admin "edit listing" form. Submitter names are kept as submitted.
 * The last day it shows (`expires`) may be any date up to MAX_POST_DAYS ahead; a past date
 * takes it down. Blank leaves the date as it is. Businesses never have one.
 */
export function validateListingEdit(body) {
  const validator = checkPublicFields(new FieldValidator(body))
    .oneOf('postType', POST_TYPE_LABELS, 'Please choose a post type.')
    .text('adminNotes', 'Admin notes', 5000);
  const expires = findPostType(body.postType).expires;
  if (expires) {
    const latest = addDays(isoDate(new Date()), config.maxPostDays);
    validator.date('expires', { max: latest }, `Please pick a date no more than ${config.maxPostDays} days from today.`);
  }
  const values = withPostTypeId(validator.result());
  return expires ? values : { ...values, expires: null };
}

/** Public "report as out of date" form. */
export function validateReport(body) {
  return new FieldValidator(body).requiredText('reason', 'Reason', 1000).result();
}

/** "Email me my links" form. */
export function validateEmailRequest(body) {
  return new FieldValidator(body).email('email', 'Email').result();
}

/** Optional note an admin can attach to approve/deny/remove/reverify. */
export function validateActionNote(body) {
  return new FieldValidator(body).text('note', 'Note', 1000).result();
}

/** The secret from a "manage your post" link. Anything malformed gets the same answer as a wrong token. */
export function validateManageToken(body) {
  const token = body?.token;
  if (!isWellFormedToken(token)) throw new HttpError(404, LINK_NOT_VALID);
  return token;
}

export const LINK_NOT_VALID =
  "This link doesn't work anymore. It may be old: use \"Email me my links\" to get a fresh one.";

/**
 * Bots fill in every field, including ones hidden from people with CSS.
 * The public forms contain a hidden "companyFax" field that real users never see.
 */
export function isLikelyBot(body) {
  return Boolean(body && typeof body.companyFax === 'string' && body.companyFax.trim());
}
