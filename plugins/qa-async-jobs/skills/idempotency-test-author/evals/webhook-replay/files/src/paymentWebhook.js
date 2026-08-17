'use strict';

function fingerprint(event) {
  return JSON.stringify([event.accountId, event.amountCents, event.currency]);
}

function createMemoryStore() {
  const entries = new Map();
  return {
    async get(key) {
      return entries.has(key) ? entries.get(key) : null;
    },
    async setIfAbsent(key, value) {
      if (entries.has(key)) {
        return false;
      }
      entries.set(key, value);
      return true;
    },
    size() {
      return entries.size;
    },
  };
}

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
    balanceOf(accountId) {
      return balances.get(accountId) || 0;
    },
    appliedCount() {
      return applied.length;
    },
  };
}

function createHandler({ store, ledger }) {
  return async function handle(event) {
    const key = event.idempotencyKey;
    if (!key) {
      return { status: 'rejected', code: 'MISSING_KEY' };
    }

    const existing = await store.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint(event)) {
        return { status: 'rejected', code: 'KEY_REUSED_WITH_DIFFERENT_PAYLOAD' };
      }
      return existing.response;
    }

    const balance = await ledger.credit(event.accountId, event.amountCents);
    const response = { status: 'applied', balance };
    await store.setIfAbsent(key, { fingerprint: fingerprint(event), response });
    return response;
  };
}

module.exports = { createHandler, createMemoryStore, createLedger, fingerprint };
