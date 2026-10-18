import './testEnv.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  addDays, chosenDuration, durationChoices, durationLabel, findPostType, findPostTypeById, isoDate,
} = await import('../public/js/post-options.js');
const { shelfLifeDays } = await import('../server/lib/shelfLife.js');
const { validateSubmission, validateListingEdit } = await import('../server/validation/listingValidation.js');
const { buildWelcomeEmail } = await import('../server/services/posterEmails.js');

const services = findPostType('Offering services');
const today = isoDate(new Date());

function fieldErrors(run) {
  try {
    run();
  } catch (error) {
    return error.details.fields;
  }
  assert.fail('expected a validation error');
}

test('the lengths are a quarter, half, three quarters and all of the maximum', () => {
  assert.deepEqual(durationChoices(90), [23, 45, 68, 90]);
  assert.deepEqual(durationChoices(28), [7, 14, 21, 28]);
  assert.deepEqual(durationChoices(4), [1, 2, 3, 4]);
});

test("a poster's choice of length is used when it's one of the choices", () => {
  assert.equal(chosenDuration(services, 23, 90), 23);
  assert.equal(chosenDuration(services, '45', 90), 45, 'form values arrive as text');
});

test('no choice, or a length that is not offered, gives the maximum', () => {
  assert.equal(chosenDuration(services, '', 90), 90);
  assert.equal(chosenDuration(services, 30, 90), 90);
  assert.equal(chosenDuration(services, 365, 90), 90);
});

test('businesses never expire, whatever is sent', () => {
  assert.equal(chosenDuration(findPostTypeById('business'), 23, 90), null);
});

test('renewal uses the length saved on the post, capped at the maximum', () => {
  assert.equal(shelfLifeDays({ post_type: 'help_wanted', duration_days: 23 }), 23);
  assert.equal(shelfLifeDays({ post_type: 'help_wanted', duration_days: null }), 90, 'date-picked and older posts get the maximum');
  assert.equal(shelfLifeDays({ post_type: 'help_wanted', duration_days: 200 }), 90, 'a lowered MAX_POST_DAYS wins');
  assert.equal(shelfLifeDays({ post_type: 'business', duration_days: null }), null);
});

test('lengths read naturally', () => {
  assert.deepEqual([7, 14, 23, 90].map(durationLabel), ['1 week', '2 weeks', '23 days', '90 days']);
});

test('dates are added by calendar day', () => {
  assert.equal(addDays('2026-10-18', 90), '2027-01-16');
  assert.equal(addDays('2026-02-27', 2), '2026-03-01');
});

const submission = {
  postType: 'Help wanted', submitterFirstName: 'A', submitterLastName: 'B', consent: true,
  title: 'Harvest help', category: 'Farm & livestock', parish: 'Holy Spirit, Atlanta',
  email: 'farm@example.com', description: 'Two days a week.',
};

test('a submission keeps a valid length and drops an invalid one to the maximum', () => {
  assert.equal(validateSubmission({ ...submission, durationDays: '45' }).durationDays, 45);
  assert.equal(validateSubmission({ ...submission, durationDays: '999' }).durationDays, 90);
  assert.equal(validateSubmission({ ...submission, postType: 'Business', durationDays: '45' }).durationDays, null);
});

test('a submission can pick its last day instead, within the maximum', () => {
  const lastDay = addDays(today, 10);
  const values = validateSubmission({ ...submission, durationDays: 'date', expires: lastDay });
  assert.equal(values.expires, lastDay);
  assert.equal(values.durationDays, null);

  for (const expires of ['', 'soon', '2026-02-30', addDays(today, -1), addDays(today, 91)]) {
    assert.ok(fieldErrors(() => validateSubmission({ ...submission, durationDays: 'date', expires })).expires, expires);
  }
});

test('a date is ignored unless the poster chose "until a date", and always for businesses', () => {
  const lastDay = addDays(today, 10);
  assert.equal(validateSubmission({ ...submission, durationDays: '45', expires: lastDay }).expires, undefined);
  const business = validateSubmission({ ...submission, postType: 'Business', durationDays: 'date', expires: lastDay });
  assert.equal(business.expires, undefined);
});

test('admins can set any last day up to the maximum, leave it blank, and businesses lose theirs', () => {
  const edit = { ...submission, expires: addDays(today, -5) };
  assert.equal(validateListingEdit(edit).expires, edit.expires, 'a past date takes it down');
  assert.equal(validateListingEdit({ ...edit, expires: '' }).expires, undefined, 'blank leaves it as it is');
  assert.ok(fieldErrors(() => validateListingEdit({ ...edit, expires: addDays(today, 91) })).expires);
  assert.equal(validateListingEdit({ ...edit, postType: 'Business' }).expires, null);
});

test('the welcome email names the chosen length or date', () => {
  const post = { title: 'Harvest help', email: 'farm@example.com', postType: 'help_wanted', durationDays: 23 };
  assert.match(buildWelcomeEmail(post, 'A'.repeat(43)).text, /show for 23 days after it's approved/);
  const dated = { ...post, durationDays: null, expires: '2026-12-24' };
  assert.match(buildWelcomeEmail(dated, 'A'.repeat(43)).text, /show until Dec 24, 2026 once it's approved/);
});
