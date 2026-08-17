# An API change means editing the same fake response in five files

## Problem Description

Every test file in this project stands up its own fake API from scratch: the
same account response is pasted into three of the files below (and two more we
have not shown), and each file repeats the same activate / revert / tear-down
block.

The account endpoint is changing. `plan` becomes an object:

```json
{ "id": "acct-1", "plan": { "tier": "pro", "seats": 10 } }
```

Last time a payload changed we updated three of the five files, and the two we
missed kept passing against a response the API no longer returns - which is how
a mapping bug reached production.

We want the default responses defined once for the whole suite, the lifecycle
wired once, and a way for an individual case to get a different response without
editing the shared defaults or affecting any other case.

## Output Specification

1. The default response for each endpoint is declared exactly once for the whole
   suite. No test file may declare its own copy of a default.
2. The activate / revert / tear-down wiring exists in exactly one place, applied
   to every test file. No test file may repeat it.
3. Apply the new account shape in that one place and update `src/account.js` to
   read it - `tier` from `plan.tier`, `seatsLeft` from `plan.seats`.
4. Add a case asserting `atSeatLimit` is `true` when the account comes back with
   zero seats. That response must apply to that case only; the other cases must
   still see 10 seats regardless of run order.
5. `npm test` passes with all four cases. No dependency may be added.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "console-app",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "msw": "^2.6.6",
    "vitest": "^2.1.8"
  }
}

=============== FILE: vitest.config.js ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});

=============== FILE: src/account.js ===============
export async function loadAccount() {
  const res = await fetch('https://api.example.com/account');
  if (!res.ok) throw new Error(`account request failed: ${res.status}`);
  const body = await res.json();

  return {
    id: body.id,
    tier: body.plan,
    seatsLeft: body.seats,
    atSeatLimit: body.seats === 0,
  };
}

=============== FILE: src/billing.js ===============
export async function loadOutstandingTotal() {
  const res = await fetch('https://api.example.com/invoices');
  if (!res.ok) throw new Error(`invoice request failed: ${res.status}`);
  const invoices = await res.json();
  return invoices.filter((invoice) => !invoice.paid).reduce((sum, i) => sum + i.amount, 0);
}

=============== FILE: src/notifications.js ===============
export async function loadUnreadCount() {
  const res = await fetch('https://api.example.com/notifications');
  if (!res.ok) throw new Error(`notification request failed: ${res.status}`);
  const items = await res.json();
  return items.filter((item) => !item.read).length;
}

=============== FILE: src/account.test.js ===============
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadAccount } from './account.js';

const server = setupServer(
  http.get('https://api.example.com/account', () =>
    HttpResponse.json({ id: 'acct-1', plan: 'pro', seats: 10 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('maps the account response', async () => {
  const account = await loadAccount();
  expect(account.tier).toBe('pro');
  expect(account.seatsLeft).toBe(10);
});

=============== FILE: src/billing.test.js ===============
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadOutstandingTotal } from './billing.js';

const server = setupServer(
  http.get('https://api.example.com/account', () =>
    HttpResponse.json({ id: 'acct-1', plan: 'pro', seats: 10 }),
  ),
  http.get('https://api.example.com/invoices', () =>
    HttpResponse.json([
      { id: 'inv-1', amount: 1200, paid: false },
      { id: 'inv-2', amount: 450, paid: true },
    ]),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('sums the unpaid invoices', async () => {
  expect(await loadOutstandingTotal()).toBe(1200);
});

=============== FILE: src/notifications.test.js ===============
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { loadUnreadCount } from './notifications.js';

const server = setupServer(
  http.get('https://api.example.com/account', () =>
    HttpResponse.json({ id: 'acct-1', plan: 'pro', seats: 10 }),
  ),
  http.get('https://api.example.com/notifications', () =>
    HttpResponse.json([
      { id: 'n-1', read: false },
      { id: 'n-2', read: true },
    ]),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('counts the unread notifications', async () => {
  expect(await loadUnreadCount()).toBe(1);
});
