'use strict';

// DRAFT - Vikram, 2026-09-08. Not wired into the npm test script yet.
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike } = MatchersV3;
const { cheapestRate } = require('../src/quote');

const provider = new PactV3({
  consumer: 'checkout-web',
  provider: 'Shiplane',
  dir: path.resolve(__dirname, '..', 'pacts'),
});

describe('Shiplane rates consumer', () => {
  it('returns rates for a shipment', async () => {
    provider
      .given('the account has rates configured')
      .uponReceiving('a rate request for a 2kg parcel to 94107')
      .withRequest({
        method: 'POST',
        path: '/v2/rates',
        body: { weight_g: 2000, to_postcode: '94107' },
      })
      .willRespondWith({
        status: 200,
        body: { rates: eachLike({ carrier: like('UPS'), amount_cents: like(900), eta_days: like(5) }) },
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/v2/rates`, {
        method: 'POST',
        body: JSON.stringify({ weight_g: 2000, to_postcode: '94107' }),
      });
      const body = await res.json();
      assert.ok(cheapestRate(body.rates));
    });
  });
});
