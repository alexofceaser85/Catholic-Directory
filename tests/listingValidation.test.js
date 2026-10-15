import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSubmission,
  validateListingEdit,
  validateReport,
  validatePosterEdit,
  validateManageToken,
  isLikelyBot,
} from '../server/validation/listingValidation.js';
import { createManageToken } from '../server/lib/manageToken.js';

const validSubmission = {
  submitterFirstName: ' Jordan ',
  submitterLastName: 'Rivera',
  postType: 'Offering services',
  category: 'Professional services',
  title: 'Peachtree Bookkeeping',
  email: 'Hello@PeachtreeBooks.example',
  phone: '(404) 555-0101',
  address: '',
  description: 'Bookkeeping for small businesses.',
  website: 'https://peachtreebooks.example',
  links: 'https://instagram.com/peachtree\n\n  https://facebook.com/peachtree  ',
  consent: true,
};

function fieldErrors(fn) {
  try {
    fn();
  } catch (error) {
    assert.equal(error.status, 400);
    return error.details.fields;
  }
  assert.fail('Expected a validation error');
}

test('cleans a valid submission', () => {
  const values = validateSubmission(validSubmission);
  assert.equal(values.submitterFirstName, 'Jordan');
  assert.equal(values.email, 'hello@peachtreebooks.example');
  assert.equal(values.address, null);
  assert.deepEqual(values.links, ['https://instagram.com/peachtree', 'https://facebook.com/peachtree']);
  assert.equal('consent' in values, false, 'consent is checked but not stored');
});

test('stores the post type id, not its label', () => {
  assert.equal(validateSubmission(validSubmission).postType, 'offering_services');
  assert.equal(validateSubmission({ ...validSubmission, postType: 'Help wanted' }).postType, 'help_wanted');
});

test('post type and category must come from the lists', () => {
  const fields = fieldErrors(() => validateSubmission({ ...validSubmission, postType: 'Classifieds', category: 'Cars' }));
  assert.deepEqual(Object.keys(fields).sort(), ['category', 'postType']);
});

test('posters can edit public fields only', () => {
  const values = validatePosterEdit({ ...validSubmission, adminNotes: 'sneaky', postType: 'Business' });
  assert.equal(values.title, 'Peachtree Bookkeeping');
  for (const field of ['adminNotes', 'postType', 'submitterFirstName', 'status']) {
    assert.equal(field in values, false, `${field} must not be editable by posters`);
  }
});

test('malformed manage tokens get the same 404 as wrong ones', () => {
  const { token } = createManageToken();
  assert.equal(validateManageToken({ token }), token);
  for (const bad of [undefined, '', 'abc', `${token}x`, { $ne: null }]) {
    assert.throws(() => validateManageToken({ token: bad }), (error) => error.status === 404);
  }
});

test('reports every invalid field at once', () => {
  const fields = fieldErrors(() =>
    validateSubmission({ ...validSubmission, title: '', email: 'nope', website: 'javascript:alert(1)', consent: false }),
  );
  assert.deepEqual(Object.keys(fields).sort(), ['consent', 'email', 'title', 'website']);
});

test('rejects links that are not web URLs', () => {
  const fields = fieldErrors(() => validateSubmission({ ...validSubmission, links: 'instagram @peachtree' }));
  assert.match(fields.links, /not a full link/);
});

test('rejects too many links', () => {
  const links = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`).join('\n');
  const fields = fieldErrors(() => validateSubmission({ ...validSubmission, links }));
  assert.match(fields.links, /10 links or fewer/);
});

test('rejects overly long text', () => {
  const fields = fieldErrors(() => validateSubmission({ ...validSubmission, description: 'x'.repeat(2001) }));
  assert.match(fields.description, /2000 characters/);
});

test('rejects phone numbers with letters', () => {
  const fields = fieldErrors(() => validateSubmission({ ...validSubmission, phone: 'call me maybe' }));
  assert.ok(fields.phone);
});

test('edits do not accept submitter names but do accept admin notes', () => {
  const values = validateListingEdit({ ...validSubmission, adminNotes: 'Called 3/4' });
  assert.equal(values.adminNotes, 'Called 3/4');
  assert.equal(values.postType, 'offering_services');
  assert.equal('submitterFirstName' in values, false);
});

test('a report needs a reason', () => {
  assert.ok(fieldErrors(() => validateReport({ reason: '   ' })).reason);
  assert.deepEqual(validateReport({ reason: ' Closed ' }), { reason: 'Closed' });
});

test('detects the honeypot field', () => {
  assert.equal(isLikelyBot({ companyFax: '555-1234' }), true);
  assert.equal(isLikelyBot({ companyFax: '' }), false);
  assert.equal(isLikelyBot(undefined), false);
});
