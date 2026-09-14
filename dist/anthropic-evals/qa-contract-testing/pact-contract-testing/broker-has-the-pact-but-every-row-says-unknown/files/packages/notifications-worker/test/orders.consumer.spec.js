'use strict';

const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike } = MatchersV3;
const { pending } = require('../src/notify');

const provider = new PactV3({
  consumer: 'notifications-worker',
  provider: 'orders-api',
  dir: path.resolve(__dirname, '..', 'pacts'),
});

describe('orders-api consumer', () => {
  it('lists unsent notifications', async () => {
    provider
      .given('there are two unsent notifications')
      .uponReceiving('a request for unsent notifications')
      .withRequest({ method: 'GET', path: '/notifications', query: { sent: 'false' } })
      .willRespondWith({
        status: 200,
        body: eachLike({ id: like(1), sent: like(false), orderId: like(5501) }),
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/notifications?sent=false`);
      assert.equal(pending(await res.json()).length, 1);
    });
  });
});
