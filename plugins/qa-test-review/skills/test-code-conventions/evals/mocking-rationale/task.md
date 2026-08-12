# Order tests assert that we called our own code

## Problem Description

`src/orderService.test.js` replaces every collaborator with a stub and then
asserts which methods were called with which arguments. It passes.

It also passed through a refactor that broke stock reservation, because the
call was still made with the same arguments - only its effect changed. The
tests describe how the service is wired rather than what it does.

`src/pricing.js` and `src/inventory.js` are ours and have no external
dependencies. `src/paymentGateway.js` calls a third-party API over the
network.

## Output Specification

1. Rewrite `src/orderService.test.js` so it asserts what the service
   produced and what changed as a result, keeping the same three scenarios.
   Do not change any file under `src/` other than the test.
2. Produce `mocking-review.md` explaining which collaborators should be
   substituted and which should not, and why the previous version survived
   the reservation bug.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders",
  "version": "3.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/pricing.js ===============
'use strict';

function priceOrder(lines) {
  return lines.reduce((sum, line) => sum + line.unitCents * line.qty, 0);
}

module.exports = { priceOrder };

=============== FILE: src/inventory.js ===============
'use strict';

function createInventory(seed) {
  const stock = new Map(Object.entries(seed));
  return {
    stockOf(sku) {
      return stock.get(sku) || 0;
    },
    reserve(sku, qty) {
      const available = stock.get(sku) || 0;
      if (available < qty) {
        return false;
      }
      stock.set(sku, available - qty);
      return true;
    },
  };
}

module.exports = { createInventory };

=============== FILE: src/paymentGateway.js ===============
'use strict';

async function charge(amountCents, token) {
  const response = await fetch('https://payments.example.com/charges', {
    method: 'POST',
    body: JSON.stringify({ amountCents, token }),
  });
  return response.json();
}

module.exports = { charge };

=============== FILE: src/orderService.js ===============
'use strict';

const { priceOrder } = require('./pricing');

function createOrderService({ inventory, gateway }) {
  return {
    async place(order) {
      for (const line of order.lines) {
        if (!inventory.reserve(line.sku, line.qty)) {
          return { status: 'rejected', reason: 'OUT_OF_STOCK', sku: line.sku };
        }
      }
      const amountCents = priceOrder(order.lines);
      const charge = await gateway.charge(amountCents, order.token);
      return { status: 'placed', amountCents, chargeId: charge.chargeId };
    },
  };
}

module.exports = { createOrderService };

=============== FILE: src/orderService.test.js ===============
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
