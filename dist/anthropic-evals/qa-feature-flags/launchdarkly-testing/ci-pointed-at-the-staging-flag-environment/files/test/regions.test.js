'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { installMulti } = require('./support/flag-states');
const { priceBook } = require('../src/pricing-flags');

const td = LaunchDarkly.TestData.dataSource();
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: td, sendEvents: false });

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('a German account gets the EU price book', async () => {
  await installMulti(td, 'price-book-region');
  assert.equal(await priceBook(client, { key: 'acct-de-9' }), 'eu');
});

test('a Japanese account gets the APAC price book', async () => {
  await installMulti(td, 'price-book-region');
  assert.equal(await priceBook(client, { key: 'acct-jp-4' }), 'apac');
});

test('an account with no regional targeting gets the global price book', async () => {
  await installMulti(td, 'price-book-region');
  assert.equal(await priceBook(client, { key: 'acct-us-2' }), 'global');
});
