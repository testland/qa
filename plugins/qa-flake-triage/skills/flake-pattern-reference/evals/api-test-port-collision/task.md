# API tests fail about half the time, always in one file or the other

## Problem Description

Since we split the API tests into two files, `node --test` fails about half
the time. The failure lands in `test/health.test.js` on some runs and in
`test/orders.test.js` on others - never both, and never the same file twice
in a row for long.

Two error shapes show up:

```
Error: listen EADDRINUSE: address already in use 127.0.0.1:4300

expected 404 to equal 200
```

The second one is confusing because the route it is asking for definitely
exists in `src/server.js`.

Running the files one at a time is always green:
`node --test test/health.test.js` then `node --test test/orders.test.js`.
Someone proposed making that the CI command permanently, and someone else
proposed retrying the suite once on `EADDRINUSE`. We would rather the tests
just worked, including when we add a third file next sprint and when we run
the suite twice concurrently on the same machine.

## Output Specification

1. Fix `test/health.test.js` and `test/orders.test.js` so a plain
   `node --test` (default concurrency, both files) passes every time, and so
   would two copies of the suite running side by side on one machine.
2. Do not modify `src/server.js`. Keep every test and its assertions.
3. Write `collision-notes.md`: what the two files were competing for, why
   the second error message appears instead of a bind failure, and what a
   third test file must do to stay out of this.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-api",
  "version": "0.9.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/server.js ===============
'use strict';

const http = require('node:http');

function createServer({ orders = [] } = {}) {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (req.url === '/orders') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(orders));
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

module.exports = { createServer };

=============== FILE: test/health.test.js ===============
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

const PORT = 4300;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('health reports ok', async () => {
  const res = await fetch(`${BASE}/health`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('an unknown route is a 404', async () => {
  const res = await fetch(`${BASE}/nope`);

  assert.equal(res.status, 404);
});

=============== FILE: test/orders.test.js ===============
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

const PORT = 4300;
const BASE = `http://127.0.0.1:${PORT}`;

const ORDERS = [
  { id: 'ord-1', total: 4200 },
  { id: 'ord-2', total: 900 },
];

let server;

before(async () => {
  server = createServer({ orders: ORDERS });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('orders are listed', async () => {
  const res = await fetch(`${BASE}/orders`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), ORDERS);
});

test('an order total is in cents', async () => {
  const res = await fetch(`${BASE}/orders`);
  const [first] = await res.json();

  assert.equal(first.total, 4200);
});
