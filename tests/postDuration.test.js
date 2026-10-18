import './testEnv.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { chosenDuration, durationLabel, findPostType, findPostTypeById } = await import('../public/js/post-options.js');
const { shelfLifeDays } = await import('../server/lib/shelfLife.js');
const { validateSubmission } = await import('../server/validation/listingValidation.js');
const { buildWelcomeEmail } = await import('../server/services/posterEmails.js');

const services = findPostType('Offering services');

test("a poster's choice of length is used when the post type offers it", () => {
  assert.equal(chosenDuration(services, 14), 14);
  assert.equal(chosenDuration(services, '30'), 30, 'form values arrive as text');
});

test('no choice, or a length the type does not offer, gives the default', () => {
  assert.equal(chosenDuration(services, ''), 60);
  assert.equal(chosenDuration(services, 365), 60);
  assert.equal(chosenDuration(findPostType('Help wanted'), 60), 30, 'help wanted tops out at 30');
});

test('businesses never expire, whatever is sent', () => {
  assert.equal(chosenDuration(findPostTypeById('business'), 14), null);
});

test('approval and renewal use the length saved on the post', () => {
  assert.equal(shelfLifeDays({ post_type: 'help_wanted', duration_days: 7 }), 7);
  assert.equal(shelfLifeDays({ post_type: 'help_wanted', duration_days: null }), 30, 'older posts keep the default');
  assert.equal(shelfLifeDays({ post_type: 'business', duration_days: null }), null);
});

test('lengths read naturally', () => {
  assert.deepEqual([7, 14, 30, 60].map(durationLabel), ['1 week', '2 weeks', '30 days', '60 days']);
});

test('a submission keeps a valid length and drops an invalid one to the default', () => {
  const base = {
    postType: 'Help wanted', submitterFirstName: 'A', submitterLastName: 'B', consent: true,
    title: 'Harvest help', category: 'Farm & livestock', parish: 'Holy Spirit, Atlanta',
    email: 'farm@example.com', description: 'Two days a week.',
  };
  assert.equal(validateSubmission({ ...base, durationDays: '14' }).durationDays, 14);
  assert.equal(validateSubmission({ ...base, durationDays: '999' }).durationDays, 30);
  assert.equal(validateSubmission({ ...base, postType: 'Business', durationDays: '14' }).durationDays, null);
});

test('the welcome email names the chosen length', () => {
  const post = { title: 'Harvest help', email: 'farm@example.com', postType: 'help_wanted', durationDays: 14 };
  assert.match(buildWelcomeEmail(post, 'A'.repeat(43)).text, /show for 2 weeks after it's approved/);
});
