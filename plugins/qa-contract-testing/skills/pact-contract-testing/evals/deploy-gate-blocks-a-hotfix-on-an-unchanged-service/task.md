# Checkout started throwing twenty minutes after a release the compatibility check waved through

## Problem Description

16:41, Friday 2026-09-12. We rolled `payments-api` `e55c108` at 16:03. At 16:20
`checkout-web` started throwing `Cannot read properties of undefined (reading
'legacy_id')` on the charge panel. Roughly one checkout in three is failing right
now and support has 40-odd tickets.

The release carried `a10c6e4` (#8812, merged 2026-09-08), which took
`charge.legacy_id` out of the charge payload. `checkout-web` still reads it. That
part I understand.

What I do not understand is the deploy pipeline. There is a compatibility check
step in `.github/workflows/deploy.yml` that exists for precisely this and nothing
else. It ran at 15:52, it exited 0, it printed a matrix of green rows, and the
deploy job went ahead on the strength of it. It has behaved the same way on all
40-odd releases since we added it and it has never once objected to anything.
Today's output is attached.

Two suggestions are already in flight and I do not trust either of them at this
hour:

- Neil has PR #9107 moving the compatibility check out of the deploy job and into
  the contracts job, immediately after the interaction-verification step, "since
  verification passing is the thing that actually proves we are compatible and the
  extra step is 40 seconds of theatre". Two approvals on it already.
- Sofia wants `--ignore checkout-web` added to the command until their release
  window on Wednesday, on the grounds that their side is the one that has not
  caught up.

Separately, and I want it in the same write-up: run 1190 last Wednesday rolled out
`9c22f10`, failed the smoke step, and we rolled back to `3c0ab41` within the hour.
The broker has a production deployment recorded for `9c22f10` anyway. That run's
tail is attached because I want to know whether it is the same problem or a
different one.

Attached: the deploy workflow, today's check output at 15:52, what the broker
holds for the production and staging environments, the consumer versions it knows
about, the platform team's release log, run 1190's tail, and the charge serializer
with its tests.

Tell me what that check was actually answering at 15:52, because it was plainly
not the question I thought I was asking it.

## Output Specification

1. Write `docs/incident-2026-09-12.md`: what the compatibility check compared the
   release candidate against at 15:52 and why that came back green, what it would
   have reported had it been asked the question we intended, and an explicit
   verdict on PR #9107 and on Sofia's suggestion, each with its reason.
2. Edit `.github/workflows/deploy.yml` for whatever your answer requires.
3. The commands to run in the next twenty minutes to stop customers failing
   checkout, in order, with the exact version each one names.
4. In the same document: what has to be corrected in the broker's record of the
   production environment before the repaired check can be believed, and what has
   to be true before `a10c6e4` can ship.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/deploy.yml ===============
name: deploy-payments-api

on:
  push:
    branches: [main]

env:
  PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
  PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test

      - name: Verify recorded interactions
        run: |
          npm run start:api &
          npx wait-on http://localhost:8081/health
          npm run verify:contracts

  staging:
    needs: contracts
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Compatibility check (staging)
        run: |
          pact-broker can-i-deploy \
            --pacticipant payments-api \
            --version ${{ github.sha }} \
            --to-environment staging
      - name: Roll out to staging
        run: ./scripts/rollout.sh staging ${{ github.sha }}
      - name: Record the staging deployment
        run: |
          pact-broker record-deployment \
            --pacticipant payments-api \
            --version ${{ github.sha }} \
            --environment staging

  production:
    needs: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Compatibility check
        run: |
          pact-broker can-i-deploy \
            --pacticipant payments-api \
            --version ${{ github.sha }}

      - name: Roll out
        run: |
          kubectl set image deploy/payments-api \
            api=registry.internal/payments-api:${{ github.sha }}
          kubectl rollout status deploy/payments-api --timeout=5m
      - name: Smoke
        run: ./scripts/smoke.sh https://payments.internal
      - name: Record the deployment
        if: always()
        run: |
          pact-broker record-deployment \
            --pacticipant payments-api \
            --version ${{ github.sha }} \
            --environment production

=============== FILE: reports/can-i-deploy-2026-09-12-1552.txt ===============
Run 1204 / job "production" / step "Compatibility check"  (2026-09-12 15:52:06Z)

$ pact-broker can-i-deploy \
    --pacticipant payments-api \
    --version e55c108

Computer says yes

CONSUMER        | C.VERSION | PROVIDER     | P.VERSION | SUCCESS? | RESULT#
----------------|-----------|--------------|-----------|----------|--------
checkout-web    | d77a01e   | payments-api | e55c108   | true     | 4471
refunds-worker  | 4c9ee21   | payments-api | e55c108   | true     | 4472

exit status 0

=============== FILE: reports/broker-environments.md ===============
# broker.internal - deployment records, exported 2026-09-12 16:35

## Environment "production", currently deployed

| Pacticipant    | Version | Recorded at      | Recorded by                   |
|----------------|---------|------------------|-------------------------------|
| payments-api   | e55c108 | 2026-09-12 16:05 | deploy-payments-api run 1204  |
| checkout-web   | a91f3c2 | 2026-08-27 09:12 | deploy-checkout-web run 4402  |
| refunds-worker | 6d10b4e | 2026-06-02 15:40 | deploy-refunds-worker run 733 |

## Environment "production", superseded records

| Pacticipant  | Version | Recorded at      | Recorded by                  |
|--------------|---------|------------------|------------------------------|
| payments-api | 9c22f10 | 2026-09-09 14:41 | deploy-payments-api run 1190 |
| payments-api | 3c0ab41 | 2026-09-01 11:34 | deploy-payments-api run 1171 |
| payments-api | 7b2d914 | 2026-07-30 10:02 | deploy-payments-api run 1120 |

## Environment "staging", currently deployed

| Pacticipant  | Version | Recorded at      | Recorded by                  |
|--------------|---------|------------------|------------------------------|
| payments-api | e55c108 | 2026-09-12 15:44 | deploy-payments-api run 1204 |
| checkout-web | d77a01e | 2026-09-10 17:20 | deploy-checkout-web run 4455 |

Every record in these tables was written by the owning repository's own pipeline.
No deployment record has been created or edited by hand since the environments
were created on 2026-05-11.

=============== FILE: reports/broker-consumer-versions.md ===============
# broker.internal - versions on record for the two consumers of payments-api

## checkout-web

| Version | Branch | Published  | Environments            |
|---------|--------|------------|-------------------------|
| d77a01e | main   | 2026-09-10 | staging (2026-09-10)    |
| a91f3c2 | main   | 2026-08-26 | production (2026-08-27) |
| 2a77b01 | main   | 2026-06-18 | -                       |

checkout-web merged their side of the `legacy_id` removal on 2026-09-10 (their
PR #6612, "stop reading charge.legacy_id"). It is on their `main` and it is on
staging. Their production release train runs weekly and the next window is
Wednesday 2026-09-17.

## refunds-worker

| Version | Branch | Published  | Environments            |
|---------|--------|------------|-------------------------|
| 4c9ee21 | main   | 2026-09-05 | -                       |
| 6d10b4e | main   | 2026-06-01 | production (2026-06-02) |

=============== FILE: docs/release-log.md ===============
# Production release log (maintained by hand by the platform team)

| Date       | Service        | Version | Note                                       |
|------------|----------------|---------|--------------------------------------------|
| 2026-06-02 | refunds-worker | 6d10b4e | idempotency keys                           |
| 2026-07-30 | payments-api   | 7b2d914 | fee rounding                               |
| 2026-08-27 | checkout-web   | a91f3c2 | checkout rewrite - current                 |
| 2026-09-01 | payments-api   | 3c0ab41 | webhook signature rotation                 |
| 2026-09-09 | payments-api   | 9c22f10 | ledger batching - smoke failed, rolled back to 3c0ab41 at 15:10 the same day |
| 2026-09-12 | payments-api   | e55c108 | webhook retry fix - current                |

`checkout-web` ships from its own repository on a weekly train; next window
Wednesday 2026-09-17. `refunds-worker` has not shipped since June.

=============== FILE: reports/run-1190-tail.txt ===============
deploy-payments-api run 1190 - job "production" - 2026-09-09

  Compatibility check ......................... success (14s)
  Roll out .................................... success (2m 51s)
  Smoke ....................................... failure (1m 12s)
      scripts/smoke.sh: POST /charges -> 500 on 3 of 5 probes
      Error: Process completed with exit code 1
  Record the deployment ....................... success (6s)
      Deployment of payments-api version 9c22f10 to production recorded.

  Job result: failure

Rolled back by hand at 15:10 with kubectl rollout undo deploy/payments-api.
No pipeline run was triggered by the rollback.

=============== FILE: src/charge.js ===============
'use strict';

function serializeCharge(row) {
  return {
    id: row.id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    created_at: row.created_at,
  };
}

module.exports = { serializeCharge };

=============== FILE: test/charge.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeCharge } = require('../src/charge');

test('serializeCharge projects the five stored columns', () => {
  const row = {
    id: 'ch_991',
    amount_cents: 4200,
    currency: 'usd',
    status: 'succeeded',
    created_at: '2026-09-12T14:02:00Z',
    internal_ledger_ref: 'lg_44',
  };
  assert.deepEqual(serializeCharge(row), {
    id: 'ch_991',
    amount_cents: 4200,
    currency: 'usd',
    status: 'succeeded',
    created_at: '2026-09-12T14:02:00Z',
  });
});

=============== FILE: src/webhook.js ===============
'use strict';

const MAX_ATTEMPTS = 3;

function backoffMs(attempt) {
  return Math.min(1000 * 2 ** attempt, 8000);
}

// A delivery that has already been charged must never be retried (INC-4402).
function shouldRetry(delivery) {
  if (delivery.charged) return false;
  if (delivery.attempts >= MAX_ATTEMPTS) return false;
  return delivery.lastError === 'timeout' || delivery.status >= 500;
}

module.exports = { MAX_ATTEMPTS, backoffMs, shouldRetry };

=============== FILE: test/webhook.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { backoffMs, shouldRetry } = require('../src/webhook');

test('backoff is capped at 8s', () => {
  assert.equal(backoffMs(0), 1000);
  assert.equal(backoffMs(2), 4000);
  assert.equal(backoffMs(9), 8000);
});

test('a charged delivery is never retried even on timeout', () => {
  assert.equal(shouldRetry({ charged: true, attempts: 0, lastError: 'timeout' }), false);
});

test('an uncharged timeout under the attempt cap is retried', () => {
  assert.equal(shouldRetry({ charged: false, attempts: 1, lastError: 'timeout' }), true);
});
