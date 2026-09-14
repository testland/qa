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
