'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { acquire, release, holderPid } = require('../src/lock');
const { runSync } = require('../src/sync');

function lockPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wsync-')), 'sync.lock');
}

function ageLock(p, ms) {
  const when = (Date.now() - ms) / 1000;
  fs.utimesSync(p, when, when);
}

test('acquire takes a free lock and records the pid', () => {
  const p = lockPath();
  assert.equal(acquire(p), true);
  assert.equal(holderPid(p), process.pid);
});

test('a second acquire is refused while the lock is held', () => {
  const p = lockPath();
  assert.equal(acquire(p), true);
  assert.equal(acquire(p), false);
});

test('release lets the next run acquire', () => {
  const p = lockPath();
  acquire(p);
  release(p);
  assert.equal(acquire(p), true);
});

test('a lock left behind by a killed run is recovered', () => {
  const p = lockPath();
  acquire(p);
  ageLock(p, 25 * 60 * 60 * 1000);
  assert.equal(acquire(p), true);
});

test('runSync skips when another run holds the lock', async () => {
  const p = lockPath();
  acquire(p);
  const result = await runSync(p, async () => 99);
  assert.deepEqual(result, { started: false, reason: 'locked' });
});

test('runSync returns the row count from a run that starts', async () => {
  const p = lockPath();
  const result = await runSync(p, async () => 18204);
  assert.deepEqual(result, { started: true, rows: 18204 });
});
