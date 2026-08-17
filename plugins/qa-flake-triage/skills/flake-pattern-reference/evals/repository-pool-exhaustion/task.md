# Whichever test we put sixth in the file is the one that fails

## Problem Description

`test/repository.test.js` was green for months. We added a sixth test last
week and the suite went red - but not on the new test. The failure was

```
Error: connection pool exhausted (max 5)
```

and it landed on whatever test happened to be sixth in the file. We moved the
new test up to position two out of curiosity and the failure moved with the
slot, not with the test: the test that had shifted into sixth place failed
instead. Every test passes on its own.

We now have seven tests and two failures. The proposals on the table are to
raise the pool's `max` to 50, and to split the file into two files of four
tests each. Neither feels right - production runs with a max of 5 and we
would like the tests to be honest about that.

`src/pool.js` and `src/orderRepository.js` are production code and are not in
scope for this change.

## Output Specification

1. Fix `test/repository.test.js` so all seven tests pass in one
   `node --test` run with the pool still capped at 5, and so that adding an
   eighth, ninth, or twentieth test to the file cannot bring the failure
   back.
2. Make the file prove it: the suite must finish with
   `pool.stats().inUse === 0`, checked in the test file itself.
3. Do not modify anything under `src/`. Keep all seven tests and their
   assertions.
4. Write `pool-cleanup-notes.md`: what each test consumed and never gave
   back, why the failure tracked the position in the file rather than the
   test, why raising `max` to 50 would only postpone it, and what the fix must
   do when a test fails partway through.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-repository",
  "version": "3.7.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/pool.js ===============
'use strict';

function createPool({ max = 5 } = {}) {
  const free = [];
  let created = 0;
  let inUse = 0;

  function acquire() {
    if (free.length === 0 && created >= max) {
      throw new Error(`connection pool exhausted (max ${max})`);
    }
    const conn =
      free.pop() || { id: (created += 1), open: true };
    inUse += 1;
    return conn;
  }

  function release(conn) {
    if (!conn) {
      return;
    }
    inUse -= 1;
    free.push(conn);
  }

  return { acquire, release, stats: () => ({ inUse, created, max }) };
}

module.exports = { createPool };

=============== FILE: src/orderRepository.js ===============
'use strict';

const table = new Map();

function assertOpen(conn) {
  if (!conn || !conn.open) {
    throw new Error('connection is not open');
  }
}

function insertOrder(conn, order) {
  assertOpen(conn);
  table.set(order.id, { ...order });
  return order.id;
}

function findOrder(conn, id) {
  assertOpen(conn);
  return table.get(id) || null;
}

function deleteOrder(conn, id) {
  assertOpen(conn);
  return table.delete(id);
}

function countOrders(conn) {
  assertOpen(conn);
  return table.size;
}

function clearTable() {
  table.clear();
}

module.exports = {
  insertOrder,
  findOrder,
  deleteOrder,
  countOrders,
  clearTable,
};

=============== FILE: test/repository.test.js ===============
'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createPool } = require('../src/pool');
const {
  insertOrder,
  findOrder,
  deleteOrder,
  countOrders,
  clearTable,
} = require('../src/orderRepository');

const pool = createPool({ max: 5 });

beforeEach(() => {
  clearTable();
});

test('an inserted order can be found', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-1', total: 4200 });

  assert.deepEqual(findOrder(conn, 'ord-1'), { id: 'ord-1', total: 4200 });
});

test('an unknown order is not found', () => {
  const conn = pool.acquire();

  assert.equal(findOrder(conn, 'ord-nope'), null);
});

test('a deleted order is gone', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-2', total: 900 });

  assert.equal(deleteOrder(conn, 'ord-2'), true);
  assert.equal(findOrder(conn, 'ord-2'), null);
});

test('the table counts what was inserted', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-3', total: 100 });
  insertOrder(conn, { id: 'ord-4', total: 200 });

  assert.equal(countOrders(conn), 2);
});

test('inserting the same id twice replaces the row', () => {
  const conn = pool.acquire();
  insertOrder(conn, { id: 'ord-5', total: 100 });
  insertOrder(conn, { id: 'ord-5', total: 300 });

  assert.equal(countOrders(conn), 1);
  assert.equal(findOrder(conn, 'ord-5').total, 300);
});

test('deleting an unknown order reports nothing deleted', () => {
  const conn = pool.acquire();

  assert.equal(deleteOrder(conn, 'ord-nope'), false);
});

test('an empty table counts zero', () => {
  const conn = pool.acquire();

  assert.equal(countOrders(conn), 0);
});
