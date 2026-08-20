'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectRecipients } = require('../src/digest');

const USERS = [
  { email: 'a@example.com', digestOptIn: true, emailVerified: true, archived: false },
  { email: 'b@example.com', digestOptIn: true, emailVerified: true, archived: true },
];

test('archived recipients are skipped', () => {
  assert.deepEqual(
    selectRecipients(USERS).map((u) => u.email),
    ['a@example.com'],
  );
});
