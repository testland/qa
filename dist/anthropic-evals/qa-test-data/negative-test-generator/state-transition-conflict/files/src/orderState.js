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
