'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { nextDelayMs, shouldReconnect, scheduleFor, CEILING_MS } = require('../src/backoff.js');

test('first attempt waits the base delay', () => {
  assert.equal(nextDelayMs(0), 500);
});

test('delay doubles per attempt', () => {
  assert.deepEqual([1, 2, 3].map(nextDelayMs), [1000, 2000, 4000]);
});

test('delay is capped at the ceiling', () => {
  assert.equal(nextDelayMs(20), CEILING_MS);
});

test('a clean close does not reconnect', () => {
  assert.equal(shouldReconnect(1000), false);
  assert.equal(shouldReconnect(1006), true);
});

test('scheduleFor combines the two decisions', () => {
  assert.deepEqual(scheduleFor(2, 1006), { reconnect: true, delayMs: 2000 });
  assert.deepEqual(scheduleFor(2, 1001), { reconnect: false });
});
