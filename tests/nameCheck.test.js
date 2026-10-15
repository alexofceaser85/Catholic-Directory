import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findNameMatches } from '../server/lib/nameCheck.js';

const base = {
  submitterFirstName: 'Taylor',
  submitterLastName: 'Nguyen',
  title: 'Bright Lens Studio',
  email: 'hello@brightlens.example',
  address: 'Atlanta, GA',
  description: 'Portrait photography.',
  website: 'https://brightlens.example',
  links: [],
};

test('returns no matches when the name is absent', () => {
  assert.deepEqual(findNameMatches(base), []);
});

test('finds the first or last name as a whole word', () => {
  const listing = { ...base, title: 'Taylor Photography', description: 'Ask for nguyen.' };
  assert.deepEqual(findNameMatches(listing), ['Title', 'Description']);
});

test('does not match a name hidden inside a longer word', () => {
  const listing = { ...base, submitterFirstName: 'Al', description: 'Serving Albany and Alpharetta.' };
  assert.deepEqual(findNameMatches(listing), []);
});

test('catches names glued together in an email address', () => {
  const listing = { ...base, email: 'taylornguyen@mail.example' };
  assert.deepEqual(findNameMatches(listing), ['Email']);
});

test('checks every link', () => {
  const listing = { ...base, links: ['https://instagram.com/brightlens', 'https://facebook.com/taylor.nguyen'] };
  assert.deepEqual(findNameMatches(listing), ['Links']);
});

test('ignores names shorter than two characters', () => {
  const listing = { ...base, submitterFirstName: 'J', description: 'J and sons' };
  assert.deepEqual(findNameMatches(listing), []);
});

test('handles names containing regex characters', () => {
  const listing = { ...base, submitterLastName: "O'Brien (Jr.)", description: 'Family run.' };
  assert.doesNotThrow(() => findNameMatches(listing));
});
