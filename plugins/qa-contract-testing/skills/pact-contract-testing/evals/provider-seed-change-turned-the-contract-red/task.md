# Catalog team changed their demo data and our contract has been red for four days

## Problem Description

The `catalog-api` team finished their product-data migration on 2026-09-08. Part
of it was replacing the rows in `services/catalog-api/seeds/catalog.js` — the old
single placeholder product became the three rows their new admin tooling and
their pricing fixtures both read. Their migration ticket PROD-3391 is marked
data-only.

Since it landed, the provider verification job for our consumer `checkout-web`
has failed on every build. Four days, 19 red runs, and that job is on the
blocking path for their deploys, so their team is sitting on two unrelated PRs
because of us.

Priya (their tech lead) has offered to unblock it herself: put the old
placeholder row back into the seed file with its original id, name and price so
the recorded interaction matches again. It is a two-line diff, she has already
written it, and she just needs someone on our side to say yes. I am inclined to
say yes — we have cost them four days and it costs them one row.

What I want first is one pass over this by someone who has not been in the
thread. Attached: our consumer spec, the contract file it generates, the code in
`apps/checkout-web/src/cart.js` that actually consumes this response and its
tests, their new seed file, the script their pipeline runs to check us, and the
verification output from the most recent red run.

Note their verification job runs two of our interactions and only one of them is
failing.

## Output Specification

1. Edit `apps/checkout-web/test/catalog.consumer.spec.js` so the verification
   stops failing and does not start failing again the next time somebody on their
   side changes data.
2. Make any other change your diagnosis requires, anywhere in the attached tree,
   and say in the write-up why it belongs where you put it.
3. Write `docs/contract-fix.md`: what the cause actually was, a yes or no on
   Priya's diff with the reason, and what has to happen after the code change
   before their verification job can go green.

## Input Files

Extract the following files before beginning.

=============== FILE: apps/checkout-web/src/cart.js ===============
'use strict';

const FREE_SHIPPING_CENTS = 7500;

function formatPrice(priceCents) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

// Anything not literally in_stock is hidden from the cart (ESC-1180).
function purchasable(products) {
  return products.filter((p) => p.availability === 'in_stock');
}

function cartTotalCents(products) {
  return products.reduce((sum, p) => sum + p.priceCents, 0);
}

function qualifiesForFreeShipping(products) {
  return cartTotalCents(products) >= FREE_SHIPPING_CENTS;
}

function toCartRow(product) {
  return { key: product.id, label: product.name, price: formatPrice(product.priceCents) };
}

module.exports = {
  FREE_SHIPPING_CENTS,
  formatPrice,
  purchasable,
  cartTotalCents,
  qualifiesForFreeShipping,
  toCartRow,
};

=============== FILE: apps/checkout-web/test/cart.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cart = require('../src/cart');

test('formatPrice renders cents as dollars', () => {
  assert.equal(cart.formatPrice(129900), '$1299.00');
  assert.equal(cart.formatPrice(0), '$0.00');
});

test('purchasable keeps only in_stock rows', () => {
  const rows = [
    { id: 1, availability: 'in_stock' },
    { id: 2, availability: 'backorder' },
    { id: 3, availability: 'discontinued' },
  ];
  assert.deepEqual(cart.purchasable(rows).map((r) => r.id), [1]);
});

test('free shipping threshold is inclusive', () => {
  assert.equal(cart.qualifiesForFreeShipping([{ priceCents: 7500 }]), true);
  assert.equal(cart.qualifiesForFreeShipping([{ priceCents: 7499 }]), false);
});

test('toCartRow projects only the three fields the cart renders', () => {
  const row = cart.toCartRow({ id: 101, name: 'Aeron Chair', priceCents: 129900, sku: 'AER-B2-GR' });
  assert.deepEqual(row, { key: 101, label: 'Aeron Chair', price: '$1299.00' });
});

=============== FILE: apps/checkout-web/test/catalog.consumer.spec.js ===============
'use strict';

const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PactV3 } = require('@pact-foundation/pact');
const { purchasable, cartTotalCents, toCartRow } = require('../src/cart');

const provider = new PactV3({
  consumer: 'checkout-web',
  provider: 'catalog-api',
  dir: path.resolve(__dirname, '..', 'pacts'),
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
        body: [
          {
            id: 101,
            name: 'Aeron Chair',
            priceCents: 129900,
            availability: 'in_stock',
            sku: 'AER-B2-GR',
          },
        ],
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

=============== FILE: pacts/checkout-web-catalog-api.json ===============
{
  "consumer": { "name": "checkout-web" },
  "provider": { "name": "catalog-api" },
  "interactions": [
    {
      "description": "a request for the products in category 12",
      "providerStates": [{ "name": "category 12 has products" }],
      "request": {
        "method": "GET",
        "path": "/categories/12/products",
        "headers": { "Accept": "application/json" }
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": [
          {
            "id": 101,
            "name": "Aeron Chair",
            "priceCents": 129900,
            "availability": "in_stock",
            "sku": "AER-B2-GR"
          }
        ]
      }
    },
    {
      "description": "a request for the products in category 99",
      "providerStates": [{ "name": "category 99 is empty" }],
      "request": {
        "method": "GET",
        "path": "/categories/99/products",
        "headers": { "Accept": "application/json" }
      },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": []
      }
    }
  ],
  "metadata": {
    "pactSpecification": { "version": "3.0.0" },
    "pactJs": { "version": "13.1.4" }
  }
}

=============== FILE: services/catalog-api/seeds/catalog.js ===============
'use strict';

// Rewritten 2026-09-08 for the product-data migration (PROD-3391). These are the
// three rows the new admin tooling and the pricing fixtures both read.
module.exports.category12 = [
  { id: 4417, name: 'Embody Chair', priceCents: 179900, availability: 'in_stock', sku: 'EMB-K4-BK' },
  { id: 4418, name: 'Sayl Chair', priceCents: 69500, availability: 'in_stock', sku: 'SAY-C1-BL' },
  { id: 4419, name: 'Cosm Chair', priceCents: 149500, availability: 'backorder', sku: 'COS-H2-GR' },
];

module.exports.category99 = [];

=============== FILE: services/catalog-api/test/verify-catalog.js ===============
'use strict';

const { Verifier } = require('@pact-foundation/pact');
const db = require('./support/db');
const { start } = require('./support/app');

// boots catalog-api on 8082 with seeds/catalog.js loaded into the store
start({ port: 8082 });

new Verifier({
  provider: 'catalog-api',
  providerBaseUrl: 'http://localhost:8082',
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  providerVersion: process.env.GITHUB_SHA,
  providerVersionBranch: process.env.GITHUB_REF_NAME,
  publishVerificationResult: true,
  consumerVersionSelectors: [{ mainBranch: true }, { deployedOrReleased: true }],
  stateHandlers: {
    'category 12 has products': async () => {
      return { description: 'catalog seed is loaded at boot' };
    },
    'category 99 is empty': async () => {
      await db.products.replaceCategory(99, []);
      return { description: 'category 99 cleared' };
    },
  },
})
  .verifyProvider()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

=============== FILE: services/catalog-api/test/support/db.js ===============
'use strict';

const store = new Map();

// Replaces every row held for a category and returns what was there before, so a
// state handler can put it back.
function replaceCategory(categoryId, rows) {
  const previous = store.get(categoryId) ?? [];
  store.set(categoryId, rows);
  return previous;
}

function productsIn(categoryId) {
  return store.get(categoryId) ?? [];
}

function load(seed) {
  for (const [key, rows] of Object.entries(seed)) {
    store.set(Number(key.replace('category', '')), rows);
  }
}

module.exports = { products: { replaceCategory, productsIn, load } };

=============== FILE: reports/verification-2026-09-11.log ===============
Verifying a pact between checkout-web and catalog-api
  [from Pact Broker https://broker.internal]

  a request for the products in category 12
    Given category 12 has products
      returns a response which
        has status code 200 (OK)
        includes headers
          "Content-Type" with value "application/json" (OK)
        has a matching body (FAILED)

  a request for the products in category 99
    Given category 99 is empty
      returns a response which
        has status code 200 (OK)
        includes headers
          "Content-Type" with value "application/json" (OK)
        has a matching body (OK)

Failures:

1) Verifying a pact between checkout-web and catalog-api
   Given category 12 has products
     a request for the products in category 12
       1.1) body: $[0].id          Expected 101 (Integer) but received 4417 (Integer)
       1.2) body: $[0].name        Expected "Aeron Chair" but received "Embody Chair"
       1.3) body: $[0].priceCents  Expected 129900 (Integer) but received 179900 (Integer)
       1.4) body: $[0].sku         Expected "AER-B2-GR" but received "EMB-K4-BK"
       1.5) body: $                Expected an array of size 1 but received an array of size 3

There were 1 pact failures

Run 19 of 19 since 2026-09-08. The same failure on every run.
