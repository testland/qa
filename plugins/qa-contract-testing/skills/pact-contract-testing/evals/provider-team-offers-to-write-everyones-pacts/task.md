# The orders team want to do all of this for us and I have to sign off by Thursday

## Problem Description

RFC-88 went out on Monday. The `orders-api` team have offered to do the whole
thing themselves: generate the expectation files for all 38 of their endpoints out
of their OpenAPI document, publish one set per consumer under each consumer's name,
register the state hooks they are missing, move their verification job into the PR
pipeline, and tidy up two things about how that job picks what to check and what
to record. Five numbered proposals, attached, along with their current verifier
script.

We are one of the four consumers named in it — `fulfillment-ui` — and Pavel has
asked each consumer team for a thumbs up or down by Thursday 2026-09-11 so they can
start Friday. Three of the four have already said yes. I am about to make it four:
our team has not written a line of this in two quarters, their offer costs us
nothing, and "38 endpoints covered by Friday" against "0 endpoints covered since
March" is not a close comparison on paper.

The two I keep re-reading are 4 and 5, because they are the two that sound like
housekeeping and they are the two where Pavel has numbers behind him. Their
verification job has gone red 23 times this quarter on work that was never merged
in anybody's repository, and their engineers have stopped reading the result. Both
proposals are aimed squarely at that and I cannot see the hole in either of them,
which is usually a sign that I am the wrong person to be signing this.

Somebody has to read it properly before Thursday and it is not going to be me.
Pavel's draft file for our service is attached, along with the endpoint it came
from, the code in `src/orderList.js` that reads the response, and their verifier as
it stands today.

If my answer to any of them is no, I need to turn up on Thursday with the thing we
would do instead already written, not with an objection. Pavel is doing us a favour
and he is the only person in the building who has moved this at all.

## Output Specification

1. Write `docs/rfc-88-review.md` with a yes or no on each of the five numbered
   proposals, the reason for each, and — for any no — what replaces it.
2. For any proposal you reject that concerns their verifier, give the exact
   configuration you would hand Pavel instead, as a diff or a code block against
   `services/orders-api/verify-orders-api.js`.
3. If your answer leaves `fulfillment-ui` owing a test of its own, write it at
   `test/orders.consumer.spec.js`, based on `src/orderList.js`.
4. Say what should happen to `pacts/generated/fulfillment-ui-orders-api.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/RFC-88.md ===============
# RFC-88 - full API coverage for orders-api by end of sprint

Author: Pavel Iliev (orders-api). Circulated 2026-09-07. Decisions by 2026-09-11.

Background: orders-api has four downstream services - fulfillment-ui,
warehouse-sync, billing-reconciler, mobile-bff. In March we asked each of them to
write expectations against us. Six months later we have expectations from none of
them, and two outages this year came from response changes we shipped without
knowing who read the field.

We are not going to get four teams to write tests. So we will write them.

## Proposal 1 - generate the expectation files from our OpenAPI document

We already maintain `openapi/orders.yaml` as the source of truth and it is
accurate; it is generated from the handler types. A script walks all 38 endpoints,
takes the documented response schema and its example for each, and emits one
expectation file per consumer - identical content, four different consumer names -
which we publish to the broker on their behalf. Every field in every documented
response is covered. Consumer teams do nothing.

## Proposal 2 - a state hook for every declared state

Right now our verifier has no hooks registered, so any expectation that names a
required starting state has nothing to set it up. We will add a handler per state
that seeds the data before the interaction is replayed.

## Proposal 3 - verify in the PR pipeline rather than nightly

Verification currently runs at 02:00 from a scheduled job against whatever is on
`main`. We want it in the PR pipeline on every commit, with the outcome recorded
against the exact build it came from.

## Proposal 4 - check only the consumer versions that are actually deployed

Our verifier takes whatever the broker hands it by default, which turns out to
include every consumer version anyone has ever published. We have gone red 23
times this quarter on consumer work that was never merged - mobile-bff's
`spike/offline-queue` branch alone accounts for 14 of them - and people have
stopped reading the result.

Fix: pin the selection to the versions recorded as deployed or released. That is
the only pairing the deploy comparison ever asks about, so it is the only pairing
worth spending a build on, and it makes an unmerged experiment in someone else's
repository incapable of turning our pipeline red. One line.

## Proposal 5 - only record a verification result when it passes

Publishing every red result leaves the matrix full of failures from builds that
were fixed ten minutes later, and the failures outlive the branch they came from.
We will keep publishing results on a pass and skip publishing on a failure - the
failure is still on the build, still red, still blocks the PR under proposal 3, so
nothing is lost. The matrix then shows the state of things rather than a history of
every bad five minutes anyone has had.

=============== FILE: services/orders-api/verify-orders-api.js ===============
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

=============== FILE: reports/orders-api-verification-2026-q3.md ===============
# orders-api scheduled verification job - Q3 summary

61 runs. 23 red.

| Consumer            | Consumer version / branch     | Red runs | Merged? |
|---------------------|-------------------------------|----------|---------|
| mobile-bff          | spike/offline-queue           | 14       | no      |
| billing-reconciler  | chore/try-decimal-amounts     | 5        | no      |
| warehouse-sync      | feat/pick-wave-v2             | 3        | yes, 2026-08-30 |
| fulfillment-ui      | -                             | 0        | -       |
| mobile-bff          | main                          | 1        | yes, 2026-07-08 |

The 2026-08-30 one is the only red that ever corresponded to a change that shipped.

Deploy comparisons run by consumer teams in the same quarter: 0. Neither
billing-reconciler nor mobile-bff has been able to get a verdict out of the
comparison step since they added it in July; both have it behind an `if: false`.

=============== FILE: openapi/orders.yaml ===============
openapi: 3.1.0
info:
  title: orders-api
  version: 4.12.0
paths:
  /orders/{orderId}:
    get:
      operationId: getOrder
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: the order
          content:
            application/json:
              schema:
                type: object
                properties:
                  id: { type: string }
                  status: { type: string, enum: [placed, picking, shipped, cancelled] }
                  placedAt: { type: string, format: date-time }
                  updatedAt: { type: string, format: date-time }
                  channel: { type: string }
                  customerId: { type: string }
                  customerTier: { type: string }
                  warehouseCode: { type: string }
                  carrierHint: { type: string }
                  pickWaveId: { type: string, nullable: true }
                  subtotalCents: { type: integer }
                  taxCents: { type: integer }
                  shippingCents: { type: integer }
                  totalCents: { type: integer }
                  currency: { type: string }
                  internalRiskScore: { type: number }
                  fraudReviewState: { type: string }
                  notesInternal: { type: string, nullable: true }
                  lines:
                    type: array
                    items:
                      type: object
                      properties:
                        sku: { type: string }
                        qty: { type: integer }
                        unitPriceCents: { type: integer }
                        pickBin: { type: string }
                        lotCode: { type: string, nullable: true }
              example:
                id: "ord_7741"
                status: "picking"
                placedAt: "2026-09-01T10:04:00Z"
                updatedAt: "2026-09-01T11:20:00Z"
                channel: "web"
                customerId: "cus_311"
                customerTier: "gold"
                warehouseCode: "LAX-2"
                carrierHint: "ups_ground"
                pickWaveId: null
                subtotalCents: 12000
                taxCents: 840
                shippingCents: 599
                totalCents: 13439
                currency: "USD"
                internalRiskScore: 0.08
                fraudReviewState: "clear"
                notesInternal: null
                lines:
                  - sku: "AER-B2-GR"
                    qty: 1
                    unitPriceCents: 12000
                    pickBin: "A-14-3"
                    lotCode: null

=============== FILE: src/orderList.js ===============
'use strict';

const VISIBLE_STATUSES = ['placed', 'picking', 'shipped'];

function toListRow(order) {
  return {
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    itemCount: order.lines.reduce((n, line) => n + line.qty, 0),
    firstSku: order.lines.length ? order.lines[0].sku : null,
  };
}

function isVisible(order) {
  return VISIBLE_STATUSES.includes(order.status);
}

function sortByPlacedAt(orders) {
  return [...orders].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

module.exports = { VISIBLE_STATUSES, toListRow, isVisible, sortByPlacedAt };

=============== FILE: test/orderList.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toListRow, isVisible, sortByPlacedAt } = require('../src/orderList');

const order = {
  id: 'ord_7741',
  status: 'picking',
  placedAt: '2026-09-01T10:04:00Z',
  customerTier: 'gold',
  totalCents: 13439,
  lines: [
    { sku: 'AER-B2-GR', qty: 1, unitPriceCents: 12000 },
    { sku: 'SAY-C1-BL', qty: 2, unitPriceCents: 6950 },
  ],
};

test('toListRow projects the five fields the row renders', () => {
  assert.deepEqual(toListRow(order), {
    id: 'ord_7741',
    status: 'picking',
    placedAt: '2026-09-01T10:04:00Z',
    itemCount: 3,
    firstSku: 'AER-B2-GR',
  });
});

test('cancelled orders are hidden from the list', () => {
  assert.equal(isVisible(order), true);
  assert.equal(isVisible({ ...order, status: 'cancelled' }), false);
});

test('sortByPlacedAt is newest first and does not mutate', () => {
  const older = { ...order, id: 'ord_7000', placedAt: '2026-08-01T10:04:00Z' };
  const input = [older, order];
  assert.deepEqual(sortByPlacedAt(input).map((o) => o.id), ['ord_7741', 'ord_7000']);
  assert.equal(input[0].id, 'ord_7000');
});

=============== FILE: pacts/generated/fulfillment-ui-orders-api.json ===============
{
  "_generatedBy": "orders-api/scripts/spec-to-expectations.mjs @ openapi/orders.yaml v4.12.0",
  "consumer": { "name": "fulfillment-ui" },
  "provider": { "name": "orders-api" },
  "interactions": [
    {
      "description": "getOrder",
      "request": { "method": "GET", "path": "/orders/ord_7741" },
      "response": {
        "status": 200,
        "body": {
          "id": "ord_7741",
          "status": "picking",
          "placedAt": "2026-09-01T10:04:00Z",
          "updatedAt": "2026-09-01T11:20:00Z",
          "channel": "web",
          "customerId": "cus_311",
          "customerTier": "gold",
          "warehouseCode": "LAX-2",
          "carrierHint": "ups_ground",
          "pickWaveId": null,
          "subtotalCents": 12000,
          "taxCents": 840,
          "shippingCents": 599,
          "totalCents": 13439,
          "currency": "USD",
          "internalRiskScore": 0.08,
          "fraudReviewState": "clear",
          "notesInternal": null,
          "lines": [
            { "sku": "AER-B2-GR", "qty": 1, "unitPriceCents": 12000, "pickBin": "A-14-3", "lotCode": null }
          ]
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "3.0.0" } }
}

=============== FILE: docs/orders-api-outages-2026.md ===============
# orders-api - the two response-change outages Pavel refers to

## 2026-02-19, 2h10m

`customerTier` was renamed to `tier`. billing-reconciler read it and started
banding every customer as untiered. Found by a finance report the next morning.

## 2026-06-04, 40m

`lines[].pickBin` was moved under a new `fulfilment` object. warehouse-sync read it
and dropped every pick instruction for four hours. Found by a warehouse supervisor
phoning the on-call.

Both changes were reviewed and both were shipped by people who had no way of
knowing which downstream service read the field.
