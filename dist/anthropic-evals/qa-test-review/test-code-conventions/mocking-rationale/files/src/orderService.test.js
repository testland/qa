'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrderService } = require('./orderService');

function spy(returns) {
  const calls = [];
  const fn = (...args) => {
    calls.push(args);
    return typeof returns === 'function' ? returns(...args) : returns;
  };
  fn.calls = calls;
  return fn;
}

test('reserves stock for each line', async () => {
  const inventory = { reserve: spy(true), stockOf: spy(10) };
  const gateway = { charge: spy(Promise.resolve({ chargeId: 'ch_1' })) };
  const service = createOrderService({ inventory, gateway });

  await service.place({
    token: 'tok_1',
    lines: [{ sku: 'A-1', unitCents: 500, qty: 2 }],
  });

  assert.equal(inventory.reserve.calls.length, 1);
  assert.deepEqual(inventory.reserve.calls[0], ['A-1', 2]);
});

test('charges the gateway', async () => {
  const inventory = { reserve: spy(true), stockOf: spy(10) };
  const gateway = { charge: spy(Promise.resolve({ chargeId: 'ch_1' })) };
  const service = createOrderService({ inventory, gateway });

  await service.place({
    token: 'tok_1',
    lines: [{ sku: 'A-1', unitCents: 500, qty: 2 }],
  });

  assert.equal(gateway.charge.calls.length, 1);
  assert.deepEqual(gateway.charge.calls[0], [1000, 'tok_1']);
});

test('rejects when stock is short', async () => {
  const inventory = { reserve: spy(false), stockOf: spy(0) };
  const gateway = { charge: spy(Promise.resolve({ chargeId: 'ch_1' })) };
  const service = createOrderService({ inventory, gateway });

  const result = await service.place({
    token: 'tok_1',
    lines: [{ sku: 'A-1', unitCents: 500, qty: 2 }],
  });

  assert.equal(result.status, 'rejected');
  assert.equal(gateway.charge.calls.length, 0);
});
