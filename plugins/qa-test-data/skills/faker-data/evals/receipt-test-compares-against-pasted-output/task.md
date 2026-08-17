# Receipt test can only ever see one customer

## Problem Description

`tests/receipt.test.js` builds one hardcoded order for John Doe and compares the
rendered receipt to a committed array of expected lines. Anyone who touches the
fixture has to re-paste the array, and in June a reviewer waved through a
re-paste that quietly changed four amount lines - the currency regression that
came with it shipped.

The renderer broke twice in production on data the fixture cannot express: a
customer whose name is 74 characters long, and an order with nine line items
that pushed the total over four digits. Our one order has a two-word ASCII name
and two items.

We want the receipt tests to run on varied, realistic orders - names of any
length including non-ASCII ones, order sizes from one item to ten - without
turning the expected-lines array into something a person re-pastes every time
the data moves.

## Output Specification

1. The orders under test come from a generator: customer names of realistic
   variety and length, one to ten line items, varied quantities and prices.
2. The assertions must survive a change in the generated data with no edit to
   the test file. They must state what the renderer guarantees rather than what
   one particular order happened to render.
3. Keep the coverage that exists today: every money value carries a `$` and
   exactly two decimals, there is one line per item plus a header and a total,
   and the total equals the sum of the line totals.
4. Two runs of the suite must produce the same orders.
5. Do not edit `src/receipt.js`. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-receipts",
  "version": "2.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "@faker-js/faker": "9.3.0",
    "vitest": "2.1.8"
  }
}

=============== FILE: src/receipt.js ===============
function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function orderTotalCents(order) {
  return order.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}

export function renderReceipt(order) {
  const lines = [`Receipt for ${order.customer.name}`];
  for (const item of order.items) {
    lines.push(
      `${item.name} x${item.quantity}  ${formatMoney(
        item.unitPriceCents * item.quantity,
      )}`,
    );
  }
  lines.push(`Total  ${formatMoney(orderTotalCents(order))}`);
  return lines;
}

=============== FILE: tests/receipt.test.js ===============
import { expect, test } from 'vitest';
import { renderReceipt } from '../src/receipt.js';

const ORDER = {
  id: 'ord-1001',
  customer: { name: 'John Doe', email: 'john.doe@example.com' },
  items: [
    { name: 'Widget', quantity: 2, unitPriceCents: 1050 },
    { name: 'Gizmo', quantity: 1, unitPriceCents: 499 },
  ],
};

const EXPECTED = [
  'Receipt for John Doe',
  'Widget x2  $21.00',
  'Gizmo x1  $4.99',
  'Total  $25.99',
];

test('renders the receipt for an order', () => {
  expect(renderReceipt(ORDER)).toEqual(EXPECTED);
});

test('the total is the last line', () => {
  const lines = renderReceipt(ORDER);
  expect(lines[lines.length - 1]).toBe('Total  $25.99');
});
