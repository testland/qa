'use strict';

const { Verifier } = require('@pact-foundation/pact');

new Verifier({
  provider: 'orders-api',
  providerBaseUrl: 'http://localhost:8080',
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  providerVersion: process.env.GITHUB_SHA,
  providerVersionBranch: process.env.GITHUB_REF_NAME,
  publishVerificationResult: true,
})
  .verifyProvider()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
