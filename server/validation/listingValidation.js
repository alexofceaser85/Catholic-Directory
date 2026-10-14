// The rules for each form in the app. Field names match the HTML form `name` attributes.
import { FieldValidator } from './FieldValidator.js';

const MAX_LINKS = 10;

function checkPublicFields(validator) {
  return validator
    .requiredText('businessName', 'Business name', 200)
    .email('email', 'Business email')
    .phone('phone', 'Phone')
    .text('address', 'Address', 500)
    .requiredText('description', 'Description', 2000)
    .url('website', 'Website')
    .urlList('links', 'Links', MAX_LINKS);
}

/** Public "add my business" form. */
export function validateSubmission(body) {
  const validator = new FieldValidator(body)
    .requiredText('submitterFirstName', 'First name', 100)
    .requiredText('submitterLastName', 'Last name', 100)
    .mustBeTrue('consent', 'Please confirm the business details may be shown publicly.');
  return checkPublicFields(validator).result();
}

/** Admin "edit listing" form. Submitter names are kept as submitted. */
export function validateListingEdit(body) {
  const validator = checkPublicFields(new FieldValidator(body)).text('adminNotes', 'Admin notes', 5000);
  return validator.result();
}

/** Public "report as out of date" form. */
export function validateReport(body) {
  return new FieldValidator(body).requiredText('reason', 'Reason', 1000).result();
}

/** Optional note an admin can attach to approve/deny/remove/reverify. */
export function validateActionNote(body) {
  return new FieldValidator(body).text('note', 'Note', 1000).result();
}

/**
 * Bots fill in every field, including ones hidden from people with CSS.
 * The public forms contain a hidden "companyFax" field that real users never see.
 */
export function isLikelyBot(body) {
  return Boolean(body && typeof body.companyFax === 'string' && body.companyFax.trim());
}
