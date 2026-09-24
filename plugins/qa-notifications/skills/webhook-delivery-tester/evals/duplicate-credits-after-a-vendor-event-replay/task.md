# 1,880 duplicate credits after Loomis replayed a day of events, and ops wants to keep the tool that let us clean it up

## Problem Description

On 2 September Loomis had a nine-hour outage and, when they came back, replayed
every event they had queued — 41,203 of them at us in about nine minutes. We
issued 1,880 duplicate account credits, roughly £24,000, most of which we have
now clawed back by hand. Finance is not pleased and the board write-up says we
will have a regression suite proving this cannot recur.

The incident doc is in the repo. Two things in it bother me more than the
duplicates, because the duplicates we at least noticed:

The support queue that week had 43 customers saying a credit they had been
promised never appeared, and separately CS logged 212 orders showing a status
they had already moved past — a couple of them still say "awaiting_payment" today
on orders that shipped in August. Nobody connected those to the replay at the
time. I would like to know whether they are the same bug wearing a different hat,
because if they are then this has been happening quietly since long before the
2nd and the duplicate credits were just the loud version.

The other thing is `WEBHOOK_REPLAY_MODE`. Priya added it at 04:10 during the
incident so she could push the missing events back through from a CSV, and it
did the job — without it we would still be reconciling. Ops have asked for it to
stay and to be written up as a standard runbook step for the next outage, and I
can see why. I want a considered answer on that, not a reflex.

The repo is plain Node, no dependencies, `node --test`. The tests we have are the
ones that were green all through this.

## Output Specification

1. Tests under `test/` that fail against `src/` as it stands and pass once it is
   fixed — one per distinct failure mode you identify, not one big one.
2. Fix `src/`, keeping the repo dependency-free.
3. `docs/incident-followup.md` — what each failure mode was, which test pins it,
   and a decision on the ops request about `WEBHOOK_REPLAY_MODE` with whatever
   the next outage should use instead if the answer is no.

## Input Files

Extract the following files before beginning.

=============== FILE: src/handler.js ===============
'use strict';

const crypto = require('node:crypto');

const SECRET = process.env.LOOMIS_WEBHOOK_SECRET || 'whsec_bG9vbWlzLWNvbW1lcmNlLXdlYmhvb2stc2VjIQ==';

// Dedupe keys seen by this process.
const seen = new Set();
const orders = new Map();
const credits = [];

function verify(rawBody, headers) {
  // Set during the 2026-09-02 incident so ops could re-drive events from a CSV.
  if (process.env.WEBHOOK_REPLAY_MODE === '1') return true;

  const id = headers['webhook-id'];
  const timestamp = Number(headers['webhook-timestamp']);
  const sigHeader = headers['webhook-signature'];
  if (!id || !Number.isFinite(timestamp) || !sigHeader) return false;

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) return false;

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([
    Buffer.from(id + '.' + timestamp + '.'),
    Buffer.from(rawBody),
  ]);
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const provided = sigHeader.startsWith('v1,') ? sigHeader.slice(3) : '';
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function handle(rawBody, headers) {
  if (!verify(rawBody, headers)) {
    return { status: 400, reason: 'bad_signature' };
  }

  const event = JSON.parse(rawBody);
  const dedupeKey = event.data.id;

  if (seen.has(dedupeKey)) {
    return { status: 409, reason: 'duplicate' };
  }
  seen.add(dedupeKey);

  switch (event.type) {
    case 'order.created':
    case 'order.updated':
      orders.set(event.data.id, {
        status: event.data.status,
        version: event.data.version,
      });
      break;
    case 'credit.issued':
      credits.push({ orderId: event.data.id, amount: event.data.amount });
      break;
    default:
      break;
  }

  return { status: 200 };
}

module.exports = { handle, verify, orders, credits, seen, SECRET };

=============== FILE: test/handler.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { handle, orders, credits, SECRET } = require('../src/handler.js');

let n = 0;

function deliver(event, { deliveryId = null } = {}) {
  const rawBody = JSON.stringify(event);
  const id = deliveryId || 'msg_' + ++n;
  const timestamp = String(Math.floor(Date.now() / 1000));

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed = Buffer.concat([Buffer.from(id + '.' + timestamp + '.'), Buffer.from(rawBody)]);
  const signature = crypto.createHmac('sha256', key).update(signed).digest('base64');

  return handle(rawBody, {
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': 'v1,' + signature,
    'content-type': 'application/json',
  });
}

test('an order.created is recorded', () => {
  const res = deliver({
    id: 'evt_a1',
    type: 'order.created',
    data: { id: 'ord_1001', status: 'awaiting_payment', version: 1 },
  });
  assert.equal(res.status, 200);
  assert.equal(orders.get('ord_1001').status, 'awaiting_payment');
});

test('a credit.issued is recorded', () => {
  const res = deliver({
    id: 'evt_b1',
    type: 'credit.issued',
    data: { id: 'ord_2001', amount: 1250, reason: 'late delivery' },
  });
  assert.equal(res.status, 200);
  assert.equal(credits.filter((c) => c.orderId === 'ord_2001').length, 1);
});

test('an unsigned delivery is rejected', () => {
  const res = handle('{"id":"evt_c1","type":"order.created","data":{"id":"ord_3001"}}', {
    'webhook-id': 'msg_unsigned',
    'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
    'webhook-signature': 'v1,3Qm0pWv7XdKzYtR1sLbA8uHcN5eJfG2iO9rTxZyQkUo=',
  });
  assert.equal(res.status, 400);
});

test('an event type we do not handle is acknowledged', () => {
  const res = deliver({
    id: 'evt_d1',
    type: 'shipment.label_printed',
    data: { id: 'ord_4001' },
  });
  assert.equal(res.status, 200);
});

=============== FILE: docs/incident-2026-09-02.md ===============
# INC-2026-09-02 — duplicate account credits following a Loomis event replay

**Severity** S1 · **Customer impact** 1,880 duplicate credits, £24,118 · **Status** remediated by hand

## Timeline (UTC)

| Time  | Event |
|-------|-------|
| 19:40 (09-01) | Loomis platform outage begins. Deliveries to us stop. |
| 04:52 | Loomis returns and begins replaying its queued events. |
| 04:52–05:01 | 41,203 deliveries arrive at our six receiver pods. |
| 05:06 | Finance alert: credit volume 40x baseline. |
| 05:14 | Endpoint taken out of the load balancer. |
| 05:41 | `WEBHOOK_REPLAY_MODE=1` set by @priya.n on a single pod to push the missing window back through from a CSV export. |
| 07:30 | Endpoint restored. Replay mode left enabled on that pod until 09-04. |

## Delivery log, pulled from the Loomis dashboard

| Outcome for the 09-02 window | Deliveries |
|---|---:|
| Acknowledged 2xx | 36,301 |
| Non-2xx, scheduled for retry | 4,902 |

Loomis retried the 4,902 on their schedule through the rest of the day.

## Sampled deliveries, 04:52–05:01

Pulled from the Loomis dashboard for order `ord_55120`:

| `webhook-id` | event `id` | type | `data.id` | `data.version` | arrived |
|---|---|---|---|---|---|
| `msg_9bTQ2xL` | `evt_4410` | `credit.issued` | `ord_55120` | — | 04:53:11 |
| `msg_9bTQ2xL` | `evt_4410` | `credit.issued` | `ord_55120` | — | 04:57:02 |
| `msg_KdP7wRn` | `evt_4488` | `credit.issued` | `ord_55120` | — | 04:57:44 |

The first two rows are the same delivery arriving twice. The third is a separate
credit for the same order, raised by an agent the previous evening for a
different reason.

## Other reports from the same week, not linked to this incident at the time

- 43 tickets: "a credit I was promised never arrived". All 43 orders had two
  distinct `credit.issued` events in the Loomis event log; one credit exists on
  our side.
- 212 orders showing a status they had already moved past. Example `ord_49871`:
  our record reads `status: awaiting_payment, version: 3`, while the Loomis
  event log for that order ends at `version: 9, status: shipped`. Both the
  version-3 and version-9 events were delivered on 09-02; the version-3 delivery
  arrived last.

## Notes from the review

- The dedupe set lives in the pod, not in a database. Six pods were serving, and
  two of them were restarted during the window.
- The version-3 and version-9 deliveries for `ord_49871` were served by different
  pods, so neither saw the other's dedupe entry. Access logs confirm this for
  most of the 212.
- No follow-up actions were recorded.

=============== FILE: docs/loomis-delivery-semantics.md ===============
# Loomis Commerce — delivery semantics (extract, integration guide v9)

- Every delivery carries a `webhook-id` that is **stable across retries of that
  delivery** and unique per delivery otherwise.
- Events carry their own `id`. A single event may be delivered more than once.
- `data.id` is the identifier of the object the event concerns. Several events
  in a stream will share a `data.id`.
- Ordering is not guaranteed. Concurrent retries and platform recovery can
  deliver events for the same object out of order. Objects that change over time
  carry a monotonically increasing `data.version`.
- **Any non-2xx response is retried** on a backoff schedule for up to 24 hours,
  after which the delivery is marked failed and can be re-sent from the
  dashboard for 30 days.
