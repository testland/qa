# Carrier integration goes live Friday and the handler was written before we had an account

## Problem Description

We switch our parcel tracking to Parcelo on Friday 18 September. Marketing has
already sent the "live tracking" email to 40,000 customers, so the date is not
moving.

Dmitri has had the integration branch open for three weeks. It is a clean branch:
handler, signature verification, four fixture payloads, a green suite, and a note
at the top of his PR that he could not test against Parcelo's sandbox because our
account was not provisioned until Monday, so he built the whole thing off their
integration guide and we would "confirm against the sandbox after launch". He has
since gone on leave until the 24th, and whatever page he was reading is not in the
repo.

I now have sandbox credentials and a very uneasy feeling about a green suite that
has never seen a request from the vendor it integrates with. On Friday night I
pointed the Parcelo sandbox at a throwaway endpoint that logs whatever arrives and
answers 200 to everything, and ran a test shipment through it overnight. Three
complete deliveries came out of that log verbatim and are in `vendor/captures/`,
along with the sandbox's own delivery report for the run.

What I want is to be confident on Friday morning, or to know by tomorrow that we
should not be. If something in this handler only goes wrong against a real
request, I want it going wrong in the suite this week instead, in front of me.

Plain Node, no dependencies, `node --test`. The sandbox secret is the default in
`src/parcelo.js`, which is its own conversation but not this week's.

## Output Specification

1. Fix whatever the review turns up in `src/`, keeping the repo dependency-free.
2. Tests under `test/` that fail against the handler as it stands. Replace the
   existing fixtures if they need replacing.
3. `docs/parcelo-go-no-go.md` — what you found, what you changed, and a straight
   go or no-go for Friday with what that verdict depends on.

## Input Files

Extract the following files before beginning.

=============== FILE: vendor/captures/delivery-1.http ===============
POST /hooks/parcelo HTTP/1.1
host: capture.internal.example
content-type: application/x-www-form-urlencoded; charset=utf-8
content-length: 168
parcelo-delivery-id: dlv_8f41c0b2e7
parcelo-timestamp: 1789116072
parcelo-signature: v1,1Vbc8akA9HV5HHmwuFoGP6x8MUxZShVxjfydV73L618=
user-agent: Parcelo-Webhooks/4.2

ShipmentId=shp_9f2c41&TrackingNumber=PRC0049182233GB&Status=in_transit&StatusDetail=Arrived%20at%20Bristol%20depot&EventTime=2026-09-11T08%3A41%3A12Z&CarrierRef=BR-9921

=============== FILE: vendor/captures/delivery-2.http ===============
POST /hooks/parcelo HTTP/1.1
host: capture.internal.example
content-type: application/x-www-form-urlencoded; charset=utf-8
content-length: 173
parcelo-delivery-id: dlv_1a77de40c9
parcelo-timestamp: 1789135367
parcelo-signature: v1,GLx8h2CjNCnOczUFZShawon68H3GlOU04Os/Fh9fQz8=
user-agent: Parcelo-Webhooks/4.2

ShipmentId=shp_9f2c41&TrackingNumber=PRC0049182233GB&Status=out_for_delivery&StatusDetail=On%20vehicle%20for%20delivery&EventTime=2026-09-11T14%3A02%3A44Z&CarrierRef=BR-9921

=============== FILE: vendor/captures/delivery-3.http ===============
POST /hooks/parcelo HTTP/1.1
host: capture.internal.example
content-type: application/x-www-form-urlencoded; charset=utf-8
content-length: 159
parcelo-delivery-id: dlv_5c03b9f118
parcelo-timestamp: 1789145703
parcelo-signature: v1,XJhI3HR4vurdyYRLtIxK5ZEh7qJ6Ap+NxICGTL5w0T8=
user-agent: Parcelo-Webhooks/4.2

ShipmentId=shp_9f2c41&TrackingNumber=PRC0049182233GB&Status=delivered&StatusDetail=Handed%20to%20resident&EventTime=2026-09-11T16%3A54%3A58Z&CarrierRef=BR-9921

=============== FILE: vendor/captures/README.md ===============
Pulled out of the capture endpoint's log on 2026-09-12, byte for byte, request
line and headers included. The capture endpoint answered 200 to everything and did
nothing else, so nothing here has been through our handler.

The sandbox delivery report for the same overnight run is in
`vendor/sandbox-delivery-report.csv`. Its `endpoint_status` column is what the
throwaway capture endpoint returned, not what our handler would return.

=============== FILE: vendor/sandbox-delivery-report.csv ===============
delivery_id,sent_at,shipment_id,status,attempts,endpoint_status
dlv_3b0e19ac77,2026-09-11T07:02:55Z,shp_9f2c41,label_created,1,200
dlv_8f41c0b2e7,2026-09-11T08:41:12Z,shp_9f2c41,in_transit,1,200
dlv_c41dd0e9b2,2026-09-11T11:20:31Z,shp_9f2c41,in_transit,1,200
dlv_1a77de40c9,2026-09-11T14:02:47Z,shp_9f2c41,out_for_delivery,1,200
dlv_5c03b9f118,2026-09-11T16:55:03Z,shp_9f2c41,delivered,1,200
dlv_7e2a44fb10,2026-09-11T18:10:08Z,shp_2a7d03,label_created,1,200
dlv_9d6c2f8a31,2026-09-11T20:44:19Z,shp_2a7d03,exception,3,200
dlv_0f5b71c6e4,2026-09-12T04:15:02Z,shp_2a7d03,returned,1,200

=============== FILE: docs/pr-notes.md ===============
# PR #812 — Parcelo tracking webhooks

Author @dmitri.k, opened 2026-08-25.

> Sandbox account isn't provisioned (IT ticket 20114, still open), so the fixtures
> in `test/fixtures/` are built from the integration guide rather than from real
> deliveries. Everything in the guide that I could turn into a test, I did. We
> confirm against the sandbox after launch.

> Parcelo waits 3 seconds for a response and our carrier-lookup call to the
> warehouse API averages 1.9s with a long tail, so the handler acknowledges first
> and applies the update after. Under load this is the difference between clean
> delivery logs and Parcelo disabling the endpoint.

Reviewer: none. Approved by @ops-bot (suite green).

=============== FILE: src/parcelo.js ===============
'use strict';

const crypto = require('node:crypto');

const SECRET = process.env.PARCELO_SECRET || 'whsec_cGFyY2Vsby1zYW5kYm94LXNoYXJlZC1zZWNyZXQh';
const TOLERANCE_SECONDS = 300;

const shipments = new Map();

function verifySignature(rawBody, headers) {
  const parsed = JSON.parse(rawBody);
  const canonical = JSON.stringify(parsed);

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed =
    headers['parcelo-delivery-id'] + '.' + headers['parcelo-timestamp'] + '.' + canonical;
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const provided = String(headers['parcelo-signature'] || '').replace(/^v1,/, '');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function fresh(headers) {
  const ts = Number(headers['parcelo-timestamp']);
  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(ts) && Math.abs(now - ts) <= TOLERANCE_SECONDS;
}

function applyUpdate(event) {
  const current = shipments.get(event.shipment_id) || { history: [] };

  switch (event.status) {
    case 'created':
      current.state = 'awaiting_pickup';
      break;
    case 'shipped':
      current.state = 'in_transit';
      break;
    case 'delivered':
      current.state = 'delivered';
      break;
    case 'failed':
      current.state = 'needs_attention';
      break;
    default:
      throw new Error('unknown Parcelo status: ' + event.status);
  }

  current.tracking = event.tracking_number;
  current.history.push(event.event_time);
  shipments.set(event.shipment_id, current);
}

function handle(rawBody, headers) {
  if (!fresh(headers)) {
    return { status: 400 };
  }
  if (!verifySignature(rawBody, headers)) {
    return { status: 400 };
  }

  const event = JSON.parse(rawBody);

  // Ack inside Parcelo's 3s budget; the warehouse lookup in applyUpdate is slow.
  queueMicrotask(() => {
    try {
      applyUpdate(event);
    } catch (err) {
      console.error('[parcelo] dropped event', event.shipment_id, err.message);
    }
  });

  return { status: 200 };
}

module.exports = { handle, verifySignature, fresh, applyUpdate, shipments, SECRET };

=============== FILE: test/fixtures/tracking-events.js ===============
'use strict';

// Built from the Parcelo integration guide while the sandbox account was pending.
module.exports = [
  {
    name: 'label created',
    body: {
      shipment_id: 'shp_000001',
      tracking_number: 'PRC0049100001GB',
      status: 'created',
      event_time: '2026-09-01T09:00:00Z',
    },
    expectedState: 'awaiting_pickup',
  },
  {
    name: 'picked up by carrier',
    body: {
      shipment_id: 'shp_000001',
      tracking_number: 'PRC0049100001GB',
      status: 'shipped',
      event_time: '2026-09-01T17:20:00Z',
      carrier_ref: 'BR-0001',
    },
    expectedState: 'in_transit',
  },
  {
    name: 'delivered',
    body: {
      shipment_id: 'shp_000001',
      tracking_number: 'PRC0049100001GB',
      status: 'delivered',
      event_time: '2026-09-02T11:04:00Z',
      carrier_ref: 'BR-0001',
    },
    expectedState: 'delivered',
  },
  {
    name: 'delivery failed',
    body: {
      shipment_id: 'shp_000002',
      tracking_number: 'PRC0049100002GB',
      status: 'failed',
      event_time: '2026-09-02T14:31:00Z',
      status_detail: 'Nobody at address',
    },
    expectedState: 'needs_attention',
  },
];

=============== FILE: test/parcelo.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { handle, verifySignature, shipments, SECRET } = require('../src/parcelo.js');
const fixtures = require('./fixtures/tracking-events.js');

let counter = 0;

function deliveryFor(bodyObject) {
  const rawBody = JSON.stringify(bodyObject);
  const id = 'dlv_test_' + ++counter;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed = id + '.' + timestamp + '.' + JSON.stringify(JSON.parse(rawBody));
  const signature = crypto.createHmac('sha256', key).update(signed).digest('base64');

  return {
    rawBody,
    headers: {
      'parcelo-delivery-id': id,
      'parcelo-timestamp': timestamp,
      'parcelo-signature': 'v1,' + signature,
      'content-type': 'application/json',
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const fixture of fixtures) {
  test('handles ' + fixture.name, async () => {
    const { rawBody, headers } = deliveryFor(fixture.body);
    const res = handle(rawBody, headers);
    assert.equal(res.status, 200);
    await settle();
    assert.equal(shipments.get(fixture.body.shipment_id).state, fixture.expectedState);
  });
}

test('a delivery with a wrong signature is rejected', () => {
  const { rawBody, headers } = deliveryFor(fixtures[0].body);
  headers['parcelo-signature'] = 'v1,7CkrqLXbYPfWTuA1mZs2hN4dEjRvG9oIcQ0KyBx6UlM=';
  assert.equal(handle(rawBody, headers).status, 400);
});

test('a delivery with the body altered after signing is rejected', () => {
  const { rawBody, headers } = deliveryFor(fixtures[0].body);
  const tampered = rawBody.replace('shp_000001', 'shp_999999');
  assert.equal(handle(tampered, headers).status, 400);
});

test('a delivery timestamped an hour ago is rejected', () => {
  const { rawBody, headers } = deliveryFor(fixtures[0].body);
  headers['parcelo-timestamp'] = String(Math.floor(Date.now() / 1000) - 3600);
  assert.equal(handle(rawBody, headers).status, 400);
});

test('signature verification is exercised directly', () => {
  const { rawBody, headers } = deliveryFor(fixtures[2].body);
  assert.equal(verifySignature(rawBody, headers), true);
});

test('an unfamiliar status is accepted without crashing the handler', () => {
  const { rawBody, headers } = deliveryFor({
    shipment_id: 'shp_000003',
    tracking_number: 'PRC0049100003GB',
    status: 'exception',
    event_time: '2026-09-03T10:00:00Z',
  });
  assert.equal(handle(rawBody, headers).status, 200);
});
