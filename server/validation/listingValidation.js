// The rules for each form in the app. Field names match the HTML form `name` attributes.
import { FieldValidator } from './FieldValidator.js';
import { HttpError } from '../lib/httpError.js';
import { isWellFormedToken } from '../lib/manageToken.js';
import { CATEGORIES, POST_TYPES, findPostType } from '../../public/js/post-options.js';

const MAX_LINKS = 10;
const POST_TYPE_LABELS = POST_TYPES.map((type) => type.label);

/** The fields shown on the public directory. Posters and admins can both edit these. */
function checkPublicFields(validator) {
  return validator
    .requiredText('title', 'Title', 200)
    .oneOf('category', CATEGORIES, 'Please choose a category.')
    .email('email', 'Contact email')
    .phone('phone', 'Phone')
    .text('address', 'Address', 500)
    .requiredText('description', 'Description', 2000)
    .url('website', 'Website')
    .urlList('links', 'Links', MAX_LINKS);
}

/** The forms send the post type's label ("Help wanted"); the database stores its id ("help_wanted"). */
function withPostTypeId(values) {
  return { ...values, postType: findPostType(values.postType).id };
}

/** Public "Add a listing" form. */
export function validateSubmission(body) {
  const validator = new FieldValidator(body)
    .oneOf('postType', POST_TYPE_LABELS, 'Please choose what you are posting.')
    .requiredText('submitterFirstName', 'First name', 100)
    .requiredText('submitterLastName', 'Last name', 100)
    .mustBeTrue('consent', 'Please confirm these details may be shown publicly.');
  return withPostTypeId(checkPublicFields(validator).result());
}

/** A poster editing their own post. They can't change the post type or their name. */
export function validatePosterEdit(body) {
  return checkPublicFields(new FieldValidator(body)).result();
}

/** Admin "edit listing" form. Submitter names are kept as submitted. */
export function validateListingEdit(body) {
  const validator = checkPublicFields(new FieldValidator(body))
    .oneOf('postType', POST_TYPE_LABELS, 'Please choose a post type.')
    .text('adminNotes', 'Admin notes', 5000);
  return withPostTypeId(validator.result());
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
