'use strict';

function createLedger() {
  const balances = new Map();
  const applied = [];
  return {
    async credit(accountId, amountCents) {
      const next = (balances.get(accountId) || 0) + amountCents;
      balances.set(accountId, next);
      applied.push({ accountId, amountCents });
      return next;
    },
    balanceOf(accountId) { return balances.get(accountId) || 0; },
    appliedCount() { return applied.length; },
  };
}

function createMeter() {
  let deliveries = 0;
  const billed = new Map();
  return {
    recordDelivery() { deliveries += 1; },
    deliveryCount() { return deliveries; },
    addBilledUsage(accountId, amountCents) {
      billed.set(accountId, (billed.get(accountId) || 0) + amountCents);
    },
    billedUsageFor(accountId) { return billed.get(accountId) || 0; },
  };
}

// Called once per delivery from the webhook edge.
function observeDelivery(meter, event) {
  meter.recordDelivery();
  meter.addBilledUsage(event.accountId, event.amountCents);
}

module.exports = { createLedger, createMeter, observeDelivery };
