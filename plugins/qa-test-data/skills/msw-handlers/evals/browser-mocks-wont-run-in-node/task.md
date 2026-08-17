# Our mocks only work inside a browser

## Problem Description

The Cypress suite gets its fake API responses from `src/mocks/browser.js`,
which registers a worker script with the page. That has worked well and the
whole team writes new endpoint definitions in `src/mocks/handlers.js`.

Now we need unit tests for `src/billing.js` under Vitest. Importing
`src/mocks/browser.js` from a Vitest test throws before any test runs - there
is no page in the Vitest process, so there is nothing to register the worker
with. Someone suggested switching Vitest to a DOM-emulating environment; that
did not help either.

What we want is the Vitest process to serve the same endpoint definitions the
Cypress suite already uses. The definitions themselves must stay in one file -
we have been bitten before by a mock that was updated in one place and not the
other.

## Output Specification

1. Make `src/mocks/handlers.js` usable from the Vitest process, without a
   browser and without a worker script, and wire the activation, per-test
   revert and teardown once for the whole Vitest run.
2. Add `src/billing.test.js` with two cases:
   - the outstanding summary computed from the default definitions
     (`count`, `total` in cents, and the overdue id list);
   - a case where the invoice endpoint returns an empty list **for that case
     only**, asserting a zero total and no overdue ids.
3. `npm test` passes, `src/money.test.js` still passes, and the Cypress entry
   point keeps working unchanged.
4. Every endpoint must be declared in exactly one place. Do not change the
   response bodies in `src/mocks/handlers.js`, and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-web",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "e2e": "cypress run"
  },
  "devDependencies": {
    "cypress": "^13.16.0",
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

=============== FILE: src/mocks/handlers.js ===============
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/invoices', () =>
    HttpResponse.json([
      { id: 'inv-1', amountCents: 120000, paid: false, dueDays: -3 },
      { id: 'inv-2', amountCents: 45000, paid: true, dueDays: 12 },
      { id: 'inv-3', amountCents: 8000, paid: false, dueDays: 5 },
    ]),
  ),
];

=============== FILE: src/mocks/browser.js ===============
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

export const worker = setupWorker(...handlers);

=============== FILE: cypress/support/e2e.js ===============
import { worker } from '../../src/mocks/browser.js';

before(() => worker.start({ onUnhandledRequest: 'error' }));

=============== FILE: src/billing.js ===============
export async function loadOutstanding() {
  const res = await fetch('https://api.example.com/invoices');
  if (!res.ok) throw new Error(`invoice request failed: ${res.status}`);
  const invoices = await res.json();
  const unpaid = invoices.filter((invoice) => !invoice.paid);

  return {
    count: unpaid.length,
    total: unpaid.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    overdue: unpaid.filter((invoice) => invoice.dueDays < 0).map((invoice) => invoice.id),
  };
}

=============== FILE: src/money.js ===============
export function formatCents(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

=============== FILE: src/money.test.js ===============
import { expect, test } from 'vitest';
import { formatCents } from './money.js';

test('formats cents as currency', () => {
  expect(formatCents(120000)).toBe('$1,200.00');
});
