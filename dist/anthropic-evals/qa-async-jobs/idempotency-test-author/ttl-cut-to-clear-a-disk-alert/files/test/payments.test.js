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
