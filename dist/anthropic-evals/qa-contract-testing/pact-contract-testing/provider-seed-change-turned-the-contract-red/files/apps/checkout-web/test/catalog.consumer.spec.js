'use strict';

const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike } = MatchersV3;
const { purchasable, cartTotalCents, toCartRow } = require('../src/cart');

const provider = new PactV3({
  consumer: 'checkout-web',
  provider: 'catalog-api',
  dir: path.resolve('pacts'),
});

describe('catalog-api consumer', () => {
  it('lists the products in a category', async () => {
    provider
      .given('category 12 has products')
      .uponReceiving('a request for the products in category 12')
      .withRequest({
        method: 'GET',
        path: '/categories/12/products',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: eachLike({
          id: like(101),
          name: like('Aeron Chair'),
          priceCents: like(129900),
          availability: 'in_stock',
          sku: 'AER-B2-GR',
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/categories/12/products`, {
        headers: { Accept: 'application/json' },
      });
      const products = await res.json();

      assert.equal(res.status, 200);
      assert.equal(purchasable(products).length, 1);
      assert.equal(cartTotalCents(products), 129900);
      assert.deepEqual(toCartRow(products[0]), {
        key: 101,
        label: 'Aeron Chair',
        price: '$1299.00',
      });
    });
  });

  it('renders an empty category', async () => {
    provider
      .given('category 99 is empty')
      .uponReceiving('a request for the products in category 99')
      .withRequest({
        method: 'GET',
        path: '/categories/99/products',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: [],
      });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/categories/99/products`, {
        headers: { Accept: 'application/json' },
      });
      assert.deepEqual(purchasable(await res.json()), []);
    });
  });
});
