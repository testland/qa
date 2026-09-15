'use strict';
const { DedupStore } = require('./dedup-store');

class Payments {
  constructor(store = new DedupStore()) {
    this.store = store;
    this.charges = [];
  }

  charge({ idempotencyKey, amountCents, customerId }, now = Date.now()) {
    const first = this.store.putIfAbsent(idempotencyKey, { amountCents, customerId }, now);
    if (!first) {
      const prior = this.store.get(idempotencyKey, now);
      return { status: 'duplicate', amountCents: prior.amountCents };
    }
    this.charges.push({ idempotencyKey, amountCents, customerId, at: now });
    return { status: 'charged', amountCents };
  }

  totalChargedFor(customerId) {
    return this.charges
      .filter((c) => c.customerId === customerId)
      .reduce((sum, c) => sum + c.amountCents, 0);
  }
}

module.exports = { Payments };
