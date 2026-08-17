'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildInvoice, buildReceipt, buildStatement } = require('./documents');
const { ORDER, ACCOUNT } = require('./fixtures');

function golden(name) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '__golden__', `${name}.json`), 'utf8'),
  );
}

test('invoice matches its baseline', () => {
  assert.deepEqual(buildInvoice(ORDER), golden('invoice'));
});

test('receipt matches its baseline', () => {
  assert.deepEqual(buildReceipt(ORDER), golden('receipt'));
});

test('statement matches its baseline', () => {
  assert.deepEqual(buildStatement(ACCOUNT), golden('statement'));
});
