---
name: pact-contract-testing
description: "Authors and verifies Pact consumer-driven contract tests across the full Pact lifecycle - consumer tests producing pact files, publishing to the Pact Broker, provider verification, and `can-i-deploy` deployment gates. Use when introducing a new HTTP/JSON API contract between two services, diagnosing breaking changes, or wiring contract verification into CI."
---

# pact-contract-testing

## Overview

Pact is a code-first tool for testing HTTP and message integrations using
**consumer-driven contract tests** ([pact-overview][overview]). The
contract is generated as a side-effect of the consumer's automated tests - each test case documents one request/response pair, and only the parts
the consumer actually uses get tested.

[overview]: https://docs.pact.io/

The full lifecycle has five steps ([pact-how-it-works][how]):

1. **Consumer test** runs against a Pact mock server using the Pact DSL.
2. The Pact framework writes a **pact file** (JSON) capturing every
   `given() → uponReceiving() → withRequest() → willRespondWith()`
   interaction.
3. The pact file is **published to the Pact Broker**.
4. The **provider verifies** the pact: each request from the file is
   replayed against the actual provider, and responses are checked
   against the contract.
5. **`can-i-deploy`** queries the Broker's matrix to confirm the
   candidate version has a green verification against every consumer/
   provider already deployed in the target environment
   ([can-i-deploy][cid]).

[how]: https://docs.pact.io/getting_started/how_pact_works
[cid]: https://docs.pact.io/pact_broker/can_i_deploy
[js]: https://docs.pact.io/implementation_guides/javascript

## When to use

- Two or more services communicate over HTTP/JSON or a message bus.
- The team owns both consumer and provider (or has access to the
  provider team) - Pact requires provider buy-in for verification.
- A team wants a deployment safety net richer than schema-only
  comparison: contract-by-example asserts what consumers **actually
  use**, not the full provider surface.
- The repo already imports `@pact-foundation/pact`,
  `pact-jvm-consumer`, `pact-python`, etc., or a `.pact/` directory is
  present.

If the API has no consumers under your control (public APIs, third-party
integrations), prefer
[`openapi-contract-diff`](../openapi-contract-diff/SKILL.md) - schema-
based diffs need no provider/consumer coordination.

## Authoring (consumer side)

### Install (Node example)

```bash
npm install --save-dev @pact-foundation/pact
```

(Per [pact-js][js].)

### Consumer test with `PactV3`

```javascript
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'web-app',
  provider: 'pet-service',
  dir: path.resolve(process.cwd(), 'pacts'),
});

describe('Pet Service consumer', () => {
  it('returns a list of dogs', async () => {
    provider
      .given('I have a list of dogs')
      .uponReceiving('a request for all dogs with the builder pattern')
      .withRequest({
        method: 'GET',
        path: '/dogs',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: eachLike({
          id: like(1),
          name: like('Rex'),
        }),
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/dogs`);
      expect(response.status).toBe(200);
    });
  });
});
```

(Adapted from [pact-js][js].)

The DSL lifecycle is **`given() → uponReceiving() → withRequest() →
willRespondWith()`**. `given()` describes a provider state the
verifier will set up later. **Matchers** like `like()` and `eachLike()`
let the contract assert *type/shape* rather than exact values, so the
provider isn't bound to fixture-specific data.

### Where pact files are written

By default, `PactV3` writes pact files to `./pacts/` relative to the
process CWD ([pact-js][js]). Each consumer/provider pair produces one
JSON file: `<consumer>-<provider>.json`.

## Publishing to the Pact Broker

The Broker is the central registry for pact files and verification
results. Publishing happens after the consumer tests pass:

```bash
npx pact-broker publish ./pacts \
  --consumer-app-version=$(git rev-parse HEAD) \
  --branch=$(git rev-parse --abbrev-ref HEAD) \
  --broker-base-url=$PACT_BROKER_BASE_URL \
  --broker-token=$PACT_BROKER_TOKEN
```

The Broker stores ([overview][overview]):

- The pact files themselves.
- Provider verification results per consumer version.
- Tags and branches that map app versions to lifecycle environments
  (e.g. `production`, `staging`, `main`).

Tagging by branch + the Git SHA as `consumer-app-version` is the
canonical pattern - `can-i-deploy` queries the matrix using these
identifiers.

## Provider verification

```javascript
const { Verifier } = require('@pact-foundation/pact');

new Verifier({
  providerBaseUrl: 'http://localhost:8081',
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  provider: 'pet-service',
  providerVersion: process.env.GIT_SHA,
  providerVersionBranch: process.env.GIT_BRANCH,
  publishVerificationResult: true,
  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true },
  ],
}).verifyProvider();
```

(Adapted from [pact-js][js].)

The provider replays every request from each pact file against a
running provider instance and compares responses
([pact-how-it-works][how]). `consumerVersionSelectors` controls which
consumer pacts get verified - `mainBranch` plus `deployedOrReleased`
ensures the provider stays compatible with both the latest consumer
work and what's currently in production.

`publishVerificationResult: true` is what makes the matrix update - 
without it, the broker has no record of this provider version's
verification status.

### Provider states

For each consumer interaction with a `given(<state>)`, the provider
test setup must register a hook that puts the system into that state
before replay. Using Express:

```javascript
new Verifier({
  ...
  stateHandlers: {
    'I have a list of dogs': async () => {
      await db.dogs.bulkInsert([{ id: 1, name: 'Rex' }]);
      return { description: 'dogs seeded' };
    },
  },
}).verifyProvider();
```

State setup that fails causes the matching interaction to fail
verification.

## `can-i-deploy` - deployment gate

Per [can-i-deploy][cid]:

```bash
pact-broker can-i-deploy \
  --pacticipant pet-service \
  --version $(git rev-parse HEAD) \
  --to-environment production
```

| Flag                  | Required | Effect                                                    |
|-----------------------|----------|-----------------------------------------------------------|
| `--pacticipant`       | yes      | Application (consumer or provider) name.                 |
| `--version`           | yes      | App version string (typically the Git SHA).              |
| `--to-environment`    | optional | Target environment to check against. Omit to check against latest. |

Exit codes ([can-i-deploy][cid]):

- `0` - "Computer says yes \\o/" - safe to deploy.
- `1` - "Computer says no" - at least one matrix cell is missing or
  failed.

The output includes a markdown-style matrix of consumer/provider
version pairs with verification status and links to detailed
verification results.

### Recording deployments

After deploying, record the deployment so subsequent `can-i-deploy`
queries see the new "currently deployed" baseline:

```bash
pact-broker record-deployment \
  --pacticipant pet-service \
  --version $(git rev-parse HEAD) \
  --environment production
```

Skipping this step is the most common reason `can-i-deploy` returns
spurious "no" verdicts.

## CI integration

A complete CI flow per side:

### Consumer pipeline

```yaml
- name: Run consumer tests + publish pact
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    npm test                           # writes ./pacts/<consumer>-<provider>.json
    npx pact-broker publish ./pacts \
      --consumer-app-version=$GITHUB_SHA \
      --branch=${GITHUB_REF##*/}

- name: Can I deploy?
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    pact-broker can-i-deploy \
      --pacticipant=web-app \
      --version=$GITHUB_SHA \
      --to-environment=production
```

### Provider pipeline

```yaml
- name: Verify pacts from broker
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    npm run start:provider &
    npx wait-on http://localhost:8081
    npm run verify:pact                # publishVerificationResult: true

- name: Can I deploy?
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    pact-broker can-i-deploy \
      --pacticipant=pet-service \
      --version=$GITHUB_SHA \
      --to-environment=production
```

`can-i-deploy` is the actual gate - pact verification happens in step
1, but a green verification alone doesn't prove every paired version
is compatible.

## References

- [pact-overview][overview] - what Pact is, contract-by-example.
- [pact-how-it-works][how] - consumer / provider / broker lifecycle.
- [pact-js][js] - Node SDK install + `PactV3` DSL + Verifier setup.
- [can-i-deploy][cid] - the deployment-gate CLI.
