# Order status changes: every refusal looks the same from the outside

## Problem Description

`src/orderState.js` moves an order between statuses. Callers must send the
version they read, so two operators editing the same order at once cannot
silently overwrite each other.

The refusals are not one thing. A caller who sent no version at all is missing
a precondition. A caller whose version is behind read a stale copy and should
re-read and retry. A caller asking for a move the workflow does not allow has
a bug and retrying will never help. A caller asking for the status the order is
already in, and a caller trying to move an order that has reached the end of
its life, are two more cases again - the support macros for those two differ,
and both come back with the same numeric status, so the code is the only thing
that tells them apart.

Only the success path is tested. Last sprint a refactor made a stale version
report as an illegal move, and the client retried forever.

## Output Specification

1. Add `src/orderState.test.js` covering the refusal paths, keeping every
   refusal reason distinguishable from the others.
2. A refusal that advanced the order's version or appended an event must fail
   the suite.
3. Do not modify `src/orderState.js`; its current behaviour is the
   specification.
4. Leave `src/orderState.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-workflow",
  "version": "7.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/orderState.js ===============
'use strict';

const TRANSITIONS = {
  draft: ['placed', 'cancelled'],
  placed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

function createStore() {
  return {
    orders: {
      ord_draft: { id: 'ord_draft', status: 'draft', version: 1 },
      ord_placed: { id: 'ord_placed', status: 'placed', version: 4 },
      ord_delivered: { id: 'ord_delivered', status: 'delivered', version: 9 },
    },
    events: [],
  };
}

function transition(store, command) {
  const { orderId, ifMatch, next } = command || {};
  const order = store.orders[orderId];

  if (!order) {
    return { status: 404, code: 'ORDER_NOT_FOUND', currentVersion: null };
  }
  if (ifMatch === undefined || ifMatch === null) {
    return { status: 428, code: 'IF_MATCH_REQUIRED', currentVersion: order.version };
  }
  if (ifMatch !== order.version) {
    return { status: 412, code: 'VERSION_STALE', currentVersion: order.version };
  }
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, next)) {
    return { status: 422, code: 'STATUS_UNKNOWN', currentVersion: order.version };
  }
  if (next === order.status) {
    return { status: 409, code: 'ALREADY_IN_STATUS', currentVersion: order.version };
  }
  if (TRANSITIONS[order.status].length === 0) {
    return { status: 409, code: 'ORDER_FINALISED', currentVersion: order.version };
  }
  if (!TRANSITIONS[order.status].includes(next)) {
    return { status: 422, code: 'TRANSITION_ILLEGAL', currentVersion: order.version };
  }

  order.status = next;
  order.version += 1;
  store.events.push({ orderId, to: next, version: order.version });
  return { status: 200, code: null, currentVersion: order.version };
}

module.exports = { createStore, transition, TRANSITIONS };

=============== FILE: src/orderState.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, transition } = require('./orderState');

test('a draft order can be placed', () => {
  const store = createStore();
  const result = transition(store, { orderId: 'ord_draft', ifMatch: 1, next: 'placed' });
  assert.equal(result.status, 200);
  assert.equal(store.orders.ord_draft.status, 'placed');
  assert.equal(store.orders.ord_draft.version, 2);
  assert.equal(store.events.length, 1);
});
