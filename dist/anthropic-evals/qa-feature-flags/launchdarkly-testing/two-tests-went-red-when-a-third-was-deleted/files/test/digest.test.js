'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { td, client, ready } = require('./support/flags');
const { shouldSendDigest } = require('../src/digest');

const MORNING = 9;
const LATE_NIGHT = 23;

before(async () => { await ready(); });
after(async () => { await client.close(); });

test('digest goes out when the flag is on, except for users who muted it', async () => {
  await td.update(
    td.flag('digest-email').booleanFlag().on(true).fallthroughVariation(0).variationForUser('u-7', 1)
  );
  assert.equal(await shouldSendDigest(client, { key: 'u-1' }, MORNING), true);
});

test('quiet hours suppress the late-night digest', async () => {
  await td.update(td.flag('quiet-hours').booleanFlag().on(true));
  assert.equal(await shouldSendDigest(client, { key: 'u-1' }, LATE_NIGHT), false);
});

test('a morning digest still goes out with quiet hours on', async () => {
  assert.equal(await shouldSendDigest(client, { key: 'u-1' }, MORNING), true);
});

test('quiet hours do not apply to the ops mailing list', async () => {
  await td.update(
    td.flag('quiet-hours').booleanFlag().variationForUser('ops-list', 1).fallthroughVariation(0)
  );
  assert.equal(await shouldSendDigest(client, { key: 'ops-list' }, LATE_NIGHT), true);
});

test('a user who muted the digest gets nothing', async () => {
  assert.equal(await shouldSendDigest(client, { key: 'u-7' }, MORNING), false);
});
