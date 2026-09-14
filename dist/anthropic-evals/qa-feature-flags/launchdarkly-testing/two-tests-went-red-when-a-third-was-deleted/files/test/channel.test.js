'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { td, client, ready } = require('./support/flags');
const { digestChannel } = require('../src/digest');

before(async () => { await ready(); });
after(async () => { await client.close(); });

test('push channel wins when the flag is on', async () => {
  await td.update(td.flag('digest-push-channel').booleanFlag().on(true));
  assert.equal(await digestChannel(client, { key: 'u-1' }), 'push');
});

test('email is the channel when the flag is off', async () => {
  await td.update(td.flag('digest-push-channel').booleanFlag().on(false));
  assert.equal(await digestChannel(client, { key: 'u-1' }), 'email');
});
