// Display helpers from the public pages (plain functions, so they run in Node too).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone } from '../public/js/format.js';
import { parishChoices, parishKey } from '../public/js/parish-filter.js';

test('US phone numbers show as xxx-xxx-xxxx however they were typed', () => {
  assert.equal(formatPhone('(404) 555-0101'), '404-555-0101');
  assert.equal(formatPhone('404.555.0101'), '404-555-0101');
  assert.equal(formatPhone('4045550101'), '404-555-0101');
  assert.equal(formatPhone('+1 404 555 0101'), '404-555-0101');
});

test('numbers that are not plain US numbers are left as typed', () => {
  assert.equal(formatPhone('404-555-0101 ext. 12'), '404-555-0101 ext. 12');
  assert.equal(formatPhone('+44 20 7946 0958'), '+44 20 7946 0958');
});

test('parish spellings that differ only in case, punctuation or "Saint" match', () => {
  assert.equal(parishKey("St. Joseph's"), parishKey(' saint joseph’s '));
  assert.equal(parishKey('Our Lady of Lourdes'), parishKey('OUR LADY OF LOURDES'));
  assert.notEqual(parishKey('St. Joseph'), parishKey('St. Jude'));
});

test('the parish filter lists each parish once, A to Z, skipping blanks', () => {
  const listings = [
    { parish: 'St. Peter Chanel' },
    { parish: 'All Saints' },
    { parish: 'saint peter chanel' },
    { parish: '' },
    { parish: undefined },
  ];
  assert.deepEqual(parishChoices(listings).map((choice) => choice.label), ['All Saints', 'St. Peter Chanel']);
});

test('"Catholic Church" and "Parish" in a parish name are ignored when matching', () => {
  assert.equal(parishKey('St. Joseph Catholic Church, Marietta'), parishKey('Saint Joseph, Marietta'));
  assert.equal(parishKey('Holy Spirit Parish, Atlanta'), parishKey('Holy Spirit, Atlanta'));
});
