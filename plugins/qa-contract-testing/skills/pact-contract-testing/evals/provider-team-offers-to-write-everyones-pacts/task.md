# The orders team wants to write our side's tests for us and I have to sign off by Thursday

## Problem Description

RFC-88 went out on Monday. The `orders-api` team have offered to do all of it
themselves: generate the expectation files for all 38 of their endpoints out of
their OpenAPI document, publish one set per consumer under each consumer's name,
check their service against the lot of them, and simplify their own deploy
pipeline while they are in there. Five numbered proposals, attached.

We are one of the four consumers named in it — `fulfillment-ui` — and Pavel has
asked each consumer team for a thumbs up or down by Thursday 2026-09-11 so they
can start Friday. Three of the four have already said yes. I am about to make it
four, because our team has not written a line of this in two quarters, their
offer costs us nothing, and "38 endpoints covered by Friday" against "0 endpoints
covered since March" is not a close comparison on paper.

Somebody has to read it properly before I do that and it is not going to be me by
Thursday. Pavel's draft file for our service is attached, along with the endpoint
it came from and the code in `src/orderList.js` that reads the response.

If my answer to any of them is no, I need to turn up on Thursday with the thing
we would do instead already written, not with an objection. Pavel is doing us a
favour and he is the only person in the building who has moved this at all.

## Output Specification

1. Write `docs/rfc-88-review.md` with a yes or no on each of the five numbered
   proposals, the reason for each, and — for any no — what replaces it.
2. If your answer leaves `fulfillment-ui` owing a test of its own, write it at
   `test/orders.consumer.spec.js`, based on `src/orderList.js`.
3. Say what should happen to `pacts/generated/fulfillment-ui-orders-api.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/RFC-88.md ===============
# RFC-88 — full API coverage for orders-api by end of sprint

Author: Pavel Iliev (orders-api). Circulated 2026-09-07. Decisions by 2026-09-11.

Background: orders-api has four downstream services — fulfillment-ui,
warehouse-sync, billing-reconciler, mobile-bff. In March we asked each of them to
write expectations against us. Six months later we have expectations from none of
them, and two outages this year came from response changes we shipped without
knowing who read the field.

We are not going to get four teams to write tests. So we will write them.

## Proposal 1 — generate the expectation files from our OpenAPI document

We already maintain `openapi/orders.yaml` as the source of truth and it is
accurate; it is generated from the handler types. A script walks all 38 endpoints,
takes the documented response schema and its example for each, and emits one
expectation file per consumer — identical content, four different consumer names —
which we publish to the broker on their behalf. Every field in every documented
response is covered. Consumer teams do nothing.

## Proposal 2 — a state hook for every declared state

Right now our verification setup has no hooks registered, so any expectation that
names a required starting state has nothing to set it up. We will add a handler
per state that seeds the data before the interaction is replayed.

## Proposal 3 — verify on every commit rather than nightly

The verification currently runs at 02:00 from a scheduled job. We want it in the
PR pipeline on every commit, recording the outcome centrally each time so the
result is attached to the exact build it came from.

## Proposal 4 — retire the compatibility check from our deploy pipeline

Our deploy pipeline runs the compatibility command against the production
environment before every rollout. It adds about 40 seconds and in 14 months it
has never once disagreed with the verification step that runs before it. Once
proposal 3 lands, every consumer's expectations are checked against every single
commit, so there is nothing left for it to tell us. We will drop it, and drop the
step that records each deployment along with it, since nothing else reads those
records.

## Proposal 5 — verify against the latest expectations from every consumer branch

Our verifier currently takes whatever the broker hands it by default. We will pin
it to the latest expectations published from every branch of every consumer, so
we find out about a consumer's change as early as possible rather than waiting
for it to be merged.

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
# orders-api — the two response-change outages Pavel refers to

## 2026-02-19, 2h10m

`customerTier` was renamed to `tier`. billing-reconciler read it and started
banding every customer as untiered. Found by a finance report the next morning.

## 2026-06-04, 40m

`lines[].pickBin` was moved under a new `fulfilment` object. warehouse-sync read
it and dropped every pick instruction for four hours. Found by a warehouse
supervisor phoning the on-call.

Both changes were reviewed and both were shipped by people who had no way of
knowing which downstream service read the field.
