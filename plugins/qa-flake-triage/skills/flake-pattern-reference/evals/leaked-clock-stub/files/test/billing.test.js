'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const clock = require('../src/clock');
const { issueReceipt } = require('../src/receipt');
const { startTimer } = require('../src/timer');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a receipt is stamped with the issue time', () => {
  clock.now = () => Date.parse('2026-02-01T09:00:00Z');

  const receipt = issueReceipt({ id: '77' });

  assert.equal(receipt.issuedAt, '2026-02-01T09:00:00.000Z');
});

test('a receipt id follows the order id', () => {
  const receipt = issueReceipt({ id: '78' });

  assert.equal(receipt.id, 'rcpt-78');
});

test('a timer reports the elapsed time', async () => {
  const timer = startTimer();

  await sleep(15);

  assert.ok(timer.elapsedMs() >= 10, `elapsed was ${timer.elapsedMs()}`);
});

test('a receipt issued now is stamped with the current time', () => {
  const before = Date.now();

  const receipt = issueReceipt({ id: '79' });

  const stamped = Date.parse(receipt.issuedAt);
  assert.ok(
    stamped >= before - 1000 && stamped <= Date.now() + 1000,
    `stamped ${receipt.issuedAt}`
  );
});
