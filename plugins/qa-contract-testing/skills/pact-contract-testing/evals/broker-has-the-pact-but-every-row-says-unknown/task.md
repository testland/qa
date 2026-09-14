# One row on the broker has said unknown since day one and there is a PR to clear it

## Problem Description

`orders-api` and `notifications-worker` live in the same monorepo. We wired both
into broker.internal on 2026-08-19. The consumer job is green. The provider
verification job is green — its log ends `1 interaction verified, 0 failed`. And
the deploy gate at the end of the provider pipeline has exited non-zero on all 61
runs since we added it, so it is still sitting behind `if: false` and nobody has
actually been blocked by it. That is the only reason this has been allowed to run
for six weeks.

The broker page is attached. There are two consumer versions on it. One says
success. The other says unknown, and has said unknown every day since we started.

Tom has PR #412 open to clear it, and three people have already approved it. His
reasoning: the unknown row is `notifications-worker 0b8e442`, which the broker
believes is what is in production. That build is from July. The consumer repo's
release script has no step that tells the broker anything, so the broker's idea
of production is simply whatever we happened to type in on the day we set it up,
and it has not moved since. His PR adds that missing step to the consumer's
release script, and he wants to run the same command by hand this afternoon to
point `production` at the current `main` build, because a fresh baseline is
obviously better than a six-week-old one and it makes the unknown row go away
immediately.

I am the one holding this up and I would like to stop holding it up. What I
cannot get past is that "we have not recorded anything since July" explains the
date on that row and does not explain to me why the cell is empty instead of red
or green. Something is filling in one row and not the other and I do not know
what.

Attached: the provider's verify script, the provider pipeline, the consumer's
current spec and source, the contract the broker holds for the July consumer
version, the provider's current response code, and the platform team's release
log.

## Output Specification

1. Write `docs/broker-diagnosis.md` listing every distinct defect you find and,
   for each, the specific thing on the attached broker page it explains. Then
   give an explicit verdict on PR #412 — on both halves of it.
2. Edit whichever of `services/orders-api/verify-orders-api.js` and
   `.github/workflows/contracts.yml` your diagnosis requires.
3. State what the deploy gate will do on the next run once your changes are in,
   and what has to be true before it exits 0.

## Input Files

Extract the following files before beginning.

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
        run: npm test --workspace=packages/notifications-worker
      - name: Publish the contract
        run: |
          npx pact-broker publish ./packages/notifications-worker/pacts \
            --consumer-app-version=${{ github.sha }} \
            --branch=${{ github.ref_name }}

  provider:
    needs: consumer
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - name: Verify
        run: |
          npm run start:orders-api &
          npx wait-on http://localhost:8081/health
          node services/orders-api/verify-orders-api.js

      - name: Can we deploy?
        if: false
        run: |
          pact-broker can-i-deploy \
            --pacticipant orders-api \
            --version ${{ github.sha }} \
            --to-environment production

=============== FILE: services/orders-api/verify-orders-api.js ===============
'use strict';

const { Verifier } = require('@pact-foundation/pact');

new Verifier({
  provider: 'orders-api',
  providerBaseUrl: 'http://localhost:8081',
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  providerVersion: process.env.GITHUB_SHA,
  providerVersionBranch: process.env.GITHUB_REF_NAME,
  publishVerificationResult: true,
  consumerVersionSelectors: [{ mainBranch: true }],
  stateHandlers: {
    'there are two unsent notifications': async () => {
      await require('./test/support/seed').unsent(2);
      return { description: 'seeded' };
    },
  },
})
  .verifyProvider()
  .then(() => {
    console.log('verification complete');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

=============== FILE: services/orders-api/src/notifications.js ===============
'use strict';

// GET /notifications?sent=false
function serializeNotification(row) {
  return {
    id: row.id,
    sent: row.sent,
    orderId: row.order_id,
  };
}

function unsentPayload(rows) {
  return rows.filter((r) => !r.sent).map(serializeNotification);
}

module.exports = { serializeNotification, unsentPayload };

=============== FILE: packages/notifications-worker/src/notify.js ===============
'use strict';

function pending(notifications) {
  return notifications.filter((n) => !n.sent);
}

function summarise(notifications) {
  return `${pending(notifications).length} unsent`;
}

module.exports = { pending, summarise };

=============== FILE: packages/notifications-worker/test/notify.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pending, summarise } = require('../src/notify');

test('pending drops anything already sent', () => {
  const rows = [{ id: 1, sent: true }, { id: 2, sent: false }];
  assert.deepEqual(pending(rows).map((r) => r.id), [2]);
});

test('summarise counts the unsent rows', () => {
  assert.equal(summarise([{ sent: true }, { sent: false }, { sent: false }]), '2 unsent');
});

=============== FILE: packages/notifications-worker/test/orders.consumer.spec.js ===============
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

=============== FILE: reports/pact-notifications-worker-0b8e442.json ===============
{
  "_source": "downloaded from broker.internal - the contract published by notifications-worker 0b8e442",
  "consumer": { "name": "notifications-worker" },
  "provider": { "name": "orders-api" },
  "interactions": [
    {
      "description": "a request for unsent notifications",
      "providerStates": [{ "name": "there are two unsent notifications" }],
      "request": { "method": "GET", "path": "/notifications", "query": { "sent": ["false"] } },
      "response": {
        "status": 200,
        "body": [{ "id": 1, "sent": false, "orderId": 5501, "channel": "email" }],
        "matchingRules": {
          "body": {
            "$": { "matchers": [{ "match": "type", "min": 1 }] },
            "$[*].id": { "matchers": [{ "match": "type" }] },
            "$[*].sent": { "matchers": [{ "match": "type" }] },
            "$[*].orderId": { "matchers": [{ "match": "type" }] },
            "$[*].channel": { "matchers": [{ "match": "type" }] }
          }
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "3.0.0" }, "pactJs": { "version": "13.1.4" } }
}

=============== FILE: reports/broker-2026-09-13.md ===============
# broker.internal — orders-api / notifications-worker

## Consumer versions on record for notifications-worker

| Version | Branch | Published  | Environments                     |
|---------|--------|------------|----------------------------------|
| 5f31a0c | main   | 2026-09-12 | —                                |
| 0b8e442 | main   | 2026-07-11 | production (recorded 2026-07-14) |

## Verification results for orders-api 8d41f06 (latest provider build)

| Consumer             | Consumer version | Result  | Recorded         |
|----------------------|------------------|---------|------------------|
| notifications-worker | 5f31a0c          | success | 2026-09-12 16:02 |
| notifications-worker | 0b8e442          | unknown | —                |

The same two rows, with the same two verdicts, appear for every one of the 61
provider builds on record since 2026-08-19.

## Environments

`production` holds: `orders-api` 3f00c19, `notifications-worker` 0b8e442.

## Deploy gate, most recent run (2026-09-12 16:05)

    $ pact-broker can-i-deploy \
        --pacticipant orders-api \
        --version 8d41f06 \
        --to-environment production

    Computer says no

    The versions of the pacticipants currently recorded as deployed to
    "production" are:

      notifications-worker   0b8e442

    CONSUMER             | C.VERSION | PROVIDER   | P.VERSION | SUCCESS?
    ---------------------|-----------|------------|-----------|---------
    notifications-worker | 0b8e442   | orders-api | 8d41f06   |

    exit status 1

=============== FILE: docs/release-log.md ===============
# Production release log (kept by hand by the platform team)

Broker environments (`production`) were created 2026-08-19. Nothing in either
repo's pipeline writes to the broker on release; the entries below are typed in
by whoever ran the release.

| Date       | Service               | Version | Note                                                    |
|------------|-----------------------|---------|---------------------------------------------------------|
| 2026-07-14 | notifications-worker  | 0b8e442 | receipts UI                                             |
| 2026-08-04 | orders-api            | 3f00c19 | current                                                 |
| 2026-08-21 | (merged, not shipped) | —       | PR #7702 — drop `channel` from the notification payload |
| 2026-09-02 | (merged, not shipped) | —       | PR #7744 — bulk send throttle                           |

`notifications-worker` has not been released since 2026-07-14; its `main` has
moved on and the release train for that service is monthly. `orders-api` has not
been released since 2026-08-04, because the deploy gate has never gone green and
the team has been waiting for it rather than shipping around it.
