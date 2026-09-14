'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { missedSlots, replayMissed } = require('../src/catchup');
const { bootReplay } = require('../src/boot');
const { createIo } = require('../src/io');
const jobs = require('../src/jobs');

const DAY = 24 * 60 * 60 * 1000;
const byName = (n) => jobs.find((j) => j.name === n);

// 2026-09-11 02:00 UTC - the boot after the September outage.
const BOOT = Date.UTC(2026, 8, 11, 2, 0);

test('missedSlots lists one slot per interval between two instants', () => {
  assert.equal(missedSlots(byName('vat-file-upload'), BOOT - 3 * DAY, BOOT).length, 3);
  assert.equal(missedSlots(byName('metrics-rollup'), BOOT - 6 * 3600000, BOOT).length, 6);
  assert.equal(missedSlots(byName('session-prune'), BOOT - 3600000, BOOT).length, 4);
});

test('a boot after a two-hour gap replays the rollup twice', () => {
  const calls = [];
  const n = replayMissed(byName('metrics-rollup'), BOOT - 2 * 3600000, BOOT, (j) => calls.push(j.name));
  assert.equal(n, 2);
  assert.deepEqual(calls, ['metrics-rollup', 'metrics-rollup']);
});

test('a boot with nothing missed replays nothing', () => {
  const calls = [];
  const n = replayMissed(byName('payout-post'), BOOT - 600000, BOOT, (j) => calls.push(j.name));
  assert.equal(n, 0);
  assert.deepEqual(calls, []);
});

test('the boot replay reports every job', () => {
  const replayed = bootReplay(createIo(), BOOT);
  assert.deepEqual(Object.keys(replayed), jobs.map((j) => j.name));
});
