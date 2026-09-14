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
