const test = require('node:test');
const assert = require('node:assert/strict');
const { normaliseEmail } = require('../src/waitlist.js');

test('addresses are trimmed and lowercased', () => {
  assert.equal(normaliseEmail('  Ada@Example.COM '), 'ada@example.com');
});

test('a non-string is rejected', () => {
  assert.throws(() => normaliseEmail(42), TypeError);
});

test('something without an at-sign is rejected', () => {
  assert.throws(() => normaliseEmail('ada.example.com'), RangeError);
});
