import './testEnv.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { toPublicListing, toAdminListing, toPosterListing, changedFields } = await import('../server/presenters/listingPresenter.js');

const row = {
  id: 7,
  status: 'approved',
  post_type: 'help_wanted',
  category: 'Farm & livestock',
  submitter_first_name: 'Mary',
  submitter_last_name: 'Jones',
  title: 'Harvest help',
  email: 'jobs@farm.example',
  phone: null,
  address: 'Douglasville, GA',
  description: 'Two days a week.',
  website: null,
  links: 'https://a.example\nhttps://b.example',
  admin_notes: 'private note',
  manage_token_hash: 'f'.repeat(64),
  submitted_at: new Date('2026-10-01T12:00:00Z'),
  reviewed_at: null,
  last_verified_at: new Date('2026-10-02T15:00:00Z'),
  expires_on: '2026-11-01',
  days_since_verified: 12,
  is_expired: 0,
};

test('the public shape has no private fields', () => {
  const listing = toPublicListing(row);
  assert.equal(listing.postType, 'Help wanted');
  assert.equal(listing.lastVerified, '2026-10-02');
  assert.equal(listing.expires, '2026-11-01');
  assert.deepEqual(listing.links, ['https://a.example', 'https://b.example']);
  const text = JSON.stringify(listing);
  for (const secret of ['Mary', 'Jones', 'private note', 'fffff', 'approved']) assert.ok(!text.includes(secret), secret);
});

test('the poster sees status and pending edits, but not admin notes or the token', () => {
  const listing = toPosterListing(row, { created_at: new Date(), changes: { title: 'New title' } });
  assert.equal(listing.status, 'approved');
  assert.equal(listing.pendingEdit.changes.title, 'New title');
  const text = JSON.stringify(listing);
  for (const secret of ['private note', 'fffff', 'Mary']) assert.ok(!text.includes(secret), secret);
});

test('only businesses need reverification; other posts expire instead', () => {
  assert.equal(toAdminListing({ ...row, days_since_verified: 200 }).needsReverification, false);
  assert.equal(toAdminListing({ ...row, post_type: 'business', days_since_verified: 200 }).needsReverification, true);
  assert.equal(toAdminListing({ ...row, is_expired: 1 }).isExpired, true);
});

test('changedFields compares link lists and empty values sensibly', () => {
  const current = { title: 'A', links: ['https://x.example'], phone: null };
  assert.deepEqual(changedFields(current, { title: 'A', links: ['https://x.example'], phone: null }), []);
  assert.deepEqual(changedFields(current, { title: 'B', links: [], phone: '555' }), ['title', 'links', 'phone']);
});
