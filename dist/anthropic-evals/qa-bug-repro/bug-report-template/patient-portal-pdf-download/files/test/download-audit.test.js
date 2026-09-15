'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { load, countByOutcome, forAccount } = require('../src/download-audit');

const rows = load(path.join(__dirname, '..', 'logs', 'letter-downloads.csv'));

test('every logged request parses', () => {
  assert.strictEqual(rows.length, 26);
  assert.ok(rows.every((r) => r.http === 200));
});

test('most requests in the window returned a letter', () => {
  assert.strictEqual(countByOutcome(rows).OK, 17);
});

test('the account that called the helpdesk appears in the log', () => {
  assert.ok(forAccount(rows, 'PT-70318').length > 0);
});
