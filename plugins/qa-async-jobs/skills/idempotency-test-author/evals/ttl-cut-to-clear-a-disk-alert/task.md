# Ops wants the key store TTL cut to 15 minutes to clear a disk alert

## Problem Description

Our payments service has paged the on-call four nights running: the Redis
instance holding request-dedup keys crosses its disk threshold around 02:00 and
someone acknowledges it and goes back to bed.

Priya from platform has proposed cutting the key TTL from 24 hours to 15
minutes. Her reasoning is in the thread and it is not unreasonable - she pulled a
week of traffic and 99.4% of duplicate requests arrive within 40 seconds of the
original, so a 15 minute window covers them with room to spare, and it drops
steady-state key count by roughly 96%. She has the change ready and wants to ship
it Thursday.

I want the alert gone. I do not want to find out in January that we cleared a
disk alert by reintroducing something worse. Decide whether her change is safe,
and implement whatever you conclude is correct.

The service, its current tests, the provider's published retry behaviour and last
quarter's incident write-up are attached.

## Output Specification

1. Edit `src/dedup-store.js` and `src/payments.js` as your decision requires. If
   you conclude the proposed value is unsafe, do not ship it.
2. Add tests to `test/payments.test.js` that would fail against the change you
   rejected, or pass against the change you made. The suite must run clean under
   `npm test`.
3. Write `docs/ttl-decision.md` - the answer to Priya, stating what the TTL must
   be and what number it is derived from, and what to do about the disk alert
   instead if you are not shipping her change.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "payments-dedup",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test test/" }
}

=============== FILE: src/dedup-store.js ===============
'use strict';

// In-memory stand-in for the Redis instance: value with an expiry, expired
// entries are gone.
const TTL_SECONDS = 24 * 60 * 60;

class DedupStore {
  constructor(ttlSeconds = TTL_SECONDS) {
    this.ttl = ttlSeconds;
    this.map = new Map();
  }

  _expired(entry, now) {
    return now >= entry.storedAt + this.ttl * 1000;
  }

  get(key, now = Date.now()) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (this._expired(e, now)) { this.map.delete(key); return undefined; }
    return e.value;
  }

  putIfAbsent(key, value, now = Date.now()) {
    const existing = this.get(key, now);
    if (existing !== undefined) return false;
    this.map.set(key, { value, storedAt: now });
    return true;
  }

  size(now = Date.now()) {
    let n = 0;
    for (const [, e] of this.map) { if (!this._expired(e, now)) n++; }
    return n;
  }
}

module.exports = { DedupStore, TTL_SECONDS };

=============== FILE: src/payments.js ===============
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

=============== FILE: test/payments.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Payments } = require('../src/payments');

test('a repeated request inside the window does not charge twice', () => {
  const p = new Payments();
  const req = { idempotencyKey: 'k-1', amountCents: 4200, customerId: 'c-9' };
  const a = p.charge(req, 0);
  const b = p.charge(req, 30000);
  assert.strictEqual(a.status, 'charged');
  assert.strictEqual(b.status, 'duplicate');
  assert.strictEqual(p.totalChargedFor('c-9'), 4200);
});

test('distinct keys charge independently', () => {
  const p = new Payments();
  p.charge({ idempotencyKey: 'k-1', amountCents: 100, customerId: 'c-1' }, 0);
  p.charge({ idempotencyKey: 'k-2', amountCents: 250, customerId: 'c-1' }, 0);
  assert.strictEqual(p.totalChargedFor('c-1'), 350);
});

=============== FILE: docs/provider-retry-policy.md ===============
# NorthPay - request retry behaviour

Extract from the provider integration guide, retrieved 2026-08-02.

> When NorthPay does not receive a 2xx within the 30 second request timeout, the
> charge request is retried on the following schedule, carrying the **same**
> `Idempotency-Key` header supplied on the original attempt:
>
> | attempt | delay after original |
> |---|---|
> | 2 | 1 minute |
> | 3 | 8 minutes |
> | 4 | 45 minutes |
> | 5 | 3 hours |
> | 6 | 6 hours |
>
> After attempt 6 the charge is marked `undeliverable` and surfaced in the
> dashboard for manual action. Merchants MUST treat a key as live until the
> retry schedule is exhausted.

=============== FILE: docs/incident-4871.md ===============
# INC-4871 - customers charged twice, 2026-06-14

**Impact:** 11 customers, 14 duplicate charges, 3,180 GBP refunded.

**Sequence.** A deploy at 21:40 left the payments pod unable to reach NorthPay
for 19 minutes. Requests timed out rather than failing fast. NorthPay retried on
its published schedule. The pod recovered at 21:59.

Nine of the duplicates were attempt 4, 45 minutes after the original. Two were
attempt 5, arriving **3 hours and 4 minutes** after the original request. In
every case the retry carried the original `Idempotency-Key`; the reason the
charge went through twice was that our own dedup entry had been evicted early by
a memory-pressure eviction policy we have since removed.

**Action taken:** eviction policy changed to `noeviction`, TTL confirmed at 24h,
alerting added on key-store memory. No duplicate charges since.

=============== FILE: ops/disk-alert.md ===============
# Alert: redis-payments-dedup disk usage

Fires at 80% of 8GB. Fired four nights running, 01:50-02:20, clearing itself each
morning as the previous day's keys expire.

Current steady state: ~2.9M live keys, mean value size 1.8KB. The value stores
the full request body, including the raw card-network response blob added in May.
Key count tracks daily transaction volume and has grown 40% since March.
