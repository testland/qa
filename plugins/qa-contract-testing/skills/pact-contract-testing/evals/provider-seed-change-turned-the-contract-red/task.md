# We already fixed this contract two days ago and their job has failed eight more times since

## Problem Description

The `catalog-api` team finished their product-data migration on 2026-09-08 —
ticket PROD-3391, which replaced the rows in `services/catalog-api/seeds/catalog.js`
and touched their verification harness in the same PR. Since it landed, their
provider verification job has failed against our consumer `checkout-web` on every
single build. Nineteen red runs in four days. That job blocks their deploys, so
two of their PRs are sitting behind us.

Rohan pushed our fix on 2026-09-10: he took the exact values out of our consumer
spec and replaced them with type matchers, which is how it should have been
written in the first place. It reviewed well, it merged, our own CI has been green
since, and their verification job has failed eight more times with output that is
byte-for-byte identical to what it was printing before he touched it. He is now
convinced the problem is entirely on their side and wants this escalated to their
EM on Monday.

Priya, their tech lead, has offered to end the argument instead: put the old
placeholder product row back into their seed file with its original id, name and
price so the recorded interaction matches again. Two-line diff, she has already
written it, she just needs someone on our side to say yes. It has cost them four
days and it costs them one row, so I am inclined to say yes and move on.

Before I answer her I want one pass from somebody who has not been in the thread.

Attached: our consumer spec and the cart code it exercises with its tests, the
generated contract files our checkout holds, our root `package.json` and
`.gitignore`, the workflow that publishes, their migrated seed file, their
verification script and the store it talks to, the output of their most recent red
run, and a listing I took this morning.

## Output Specification

1. Make whatever changes are needed so their verification job can go green. Change
   anything in the attached tree you need to, and say in the write-up why each
   change belongs where you put it.
2. An explicit yes or no on Priya's diff, with the reason.
3. Write `docs/contract-fix.md` with the cause, and with what has to happen after
   the code change before their pipeline sees any of it.
4. In the same document, state what their verification job will report on its next
   run once your changes are in, interaction by interaction.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "test": "node --test apps/checkout-web/test/cart.test.js apps/checkout-web/test/catalog.consumer.spec.js"
  },
  "devDependencies": {
    "@pact-foundation/pact": "^13.1.4"
  }
}

=============== FILE: .gitignore ===============
node_modules/
coverage/
.env
.DS_Store
/pacts/
*.log

=============== FILE: .github/workflows/contracts.yml ===============
name: contracts

on:
  push:
    branches: [main]

env:
  PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
  PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

jobs:
  consumer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Consumer tests
        run: npm test
      - name: Publish the contract
        run: |
          npx pact-broker publish apps/checkout-web/pacts \
            --consumer-app-version=${{ github.sha }} \
            --branch=${{ github.ref_name }}

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
        ],
        "matchingRules": {
          "body": {
            "$": { "matchers": [{ "match": "type", "min": 1 }] },
            "$[*].id": { "matchers": [{ "match": "type" }] },
            "$[*].name": { "matchers": [{ "match": "type" }] },
            "$[*].priceCents": { "matchers": [{ "match": "type" }] }
          }
        }
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

=============== FILE: apps/checkout-web/pacts/checkout-web-catalog-api.json ===============
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
    "pactJs": { "version": "13.0.2" }
  }
}

=============== FILE: reports/listing-2026-09-12.txt ===============
$ ls -la pacts apps/checkout-web/pacts

pacts:
-rw-r--r--  1 rohan  staff  1704 Sep 12 09:14 checkout-web-catalog-api.json

apps/checkout-web/pacts:
-rw-r--r--  1 rohan  staff   842 Jun 30 16:02 checkout-web-catalog-api.json

$ git check-ignore -v pacts/checkout-web-catalog-api.json
.gitignore:5:/pacts/	pacts/checkout-web-catalog-api.json

$ git log -1 --format='%h %ad %s' -- apps/checkout-web/pacts/checkout-web-catalog-api.json
9f2c015  Tue Jun 30 16:02:11 2026 +0100  chore: commit the generated catalog contract

$ git log --oneline -3 -- apps/checkout-web/test/catalog.consumer.spec.js
5c9d31b  fix(contract): match catalog fields on type instead of exact values
8801af4  test: assert the cart row projection in the consumer test
9f2c015  test: first catalog consumer test

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

// Added in PROD-3391 so the declared states stop depending on whatever the
// migration leaves in the seed file.
const CONTRACT_FIXTURE_12 = [
  { id: 7001, name: 'Contract Fixture Chair', priceCents: 100000, availability: 'in_stock', sku: 'FIX-1' },
];

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
      const previous = db.products.replaceCategory(12, CONTRACT_FIXTURE_12);
      return { description: 'category 12 replaced with the contract fixture row', previous };
    },
    'category 99 is empty': async () => {
      db.products.replaceCategory(99, []);
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

=============== FILE: reports/verification-2026-09-12.log ===============
Verifying a pact between checkout-web and catalog-api
  [from Pact Broker https://broker.internal]
  consumer version 5c9d31b (branch main, published 2026-09-11 08:31)

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
       1.1) body: $[0].id          Expected 101 (Integer) but received 7001 (Integer)
       1.2) body: $[0].name        Expected "Aeron Chair" but received "Contract Fixture Chair"
       1.3) body: $[0].priceCents  Expected 129900 (Integer) but received 100000 (Integer)
       1.4) body: $[0].sku         Expected "AER-B2-GR" but received "FIX-1"

There were 1 pact failures

Run 27 of 27 since 2026-09-08. Byte-identical output on every run, including the
eight since 2026-09-10.
