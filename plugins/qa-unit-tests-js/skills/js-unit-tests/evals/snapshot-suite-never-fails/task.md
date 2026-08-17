# The invoice suite has never once failed

## Problem Description

Last month we shipped a change that moved the tax line above the net line and
rounded the tax the wrong way. Customers noticed. Our suite did not: three green
checks, both before and after.

Two things are going on. `.gitignore` has an entry for the generated baseline
directory, so no baseline is in the repository and CI writes a fresh one on
every run - there is nothing to compare against, and a first run always agrees
with itself. And even with a baseline committed, the three checks would only
have told us "the output changed", which is what a formatting change is
supposed to do; whoever accepted the diff would have accepted the wrong
rounding along with it.

We want the suite to be able to fail. `src/format-invoice.js` is correct as it
stands - it was fixed in the hotfix - so this is about the tests, not the
formatter.

## Output Specification

1. Each of the three cases must assert the things a reviewer actually cares
   about: the reference line, the per-line amounts, the net, the tax, and the
   grand total, in the currency the invoice is in. A change to any of those
   numbers, or to the currency symbol, must fail the run.
2. If any whole-output comparison remains, its baseline must be committed to the
   repository, and the CI invocation must fail rather than silently create one
   that is missing.
3. All three cases stay - single line, several lines, and the zero-tax US
   invoice. `npm test` exits clean when you are done.
4. Do not change `src/format-invoice.js`, and do not add packages to
   `package.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "invoice-render",
  "version": "1.4.1",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: .gitignore ===============
node_modules/
coverage/
**/__snapshots__/

=============== FILE: jest.config.js ===============
module.exports = {
  testEnvironment: 'node',
};

=============== FILE: .github/workflows/test.yml ===============
name: test

on: [pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test

=============== FILE: src/format-invoice.js ===============
const SYMBOLS = { EUR: '€', USD: '$' };

function money(cents, code) {
  return `${SYMBOLS[code]}${(cents / 100).toFixed(2)}`;
}

function formatInvoice(invoice) {
  const net = invoice.lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const tax = Math.round(net * invoice.taxRate);
  const rendered = invoice.lines.map(
    (l) => `${l.description} x${l.qty} ${money(l.unitCents * l.qty, invoice.currency)}`,
  );

  return [
    `INVOICE ${invoice.reference}`,
    ...rendered,
    `Net ${money(net, invoice.currency)}`,
    `Tax ${money(tax, invoice.currency)}`,
    `Total ${money(net + tax, invoice.currency)}`,
  ].join('\n');
}

module.exports = { formatInvoice };

=============== FILE: src/format-invoice.test.js ===============
const { formatInvoice } = require('./format-invoice');

const base = {
  reference: 'INV-1001',
  currency: 'EUR',
  taxRate: 0.19,
  lines: [{ description: 'Widget', qty: 2, unitCents: 1250 }],
};

test('renders a single-line invoice', () => {
  expect(formatInvoice(base)).toMatchSnapshot();
});

test('renders several lines', () => {
  const invoice = {
    ...base,
    lines: [...base.lines, { description: 'Gizmo', qty: 1, unitCents: 999 }],
  };

  expect(formatInvoice(invoice)).toMatchSnapshot();
});

test('renders a zero-tax invoice in dollars', () => {
  expect(formatInvoice({ ...base, currency: 'USD', taxRate: 0 })).toMatchSnapshot();
});
