# Coverage says 95%, and it is not true

## Problem Description

`npm run coverage` reports around 95% and the number has been quoted in our
release checklist for months. It is wrong.

`src/pricing.js` has tests. `src/discount.js` and `src/tax.js` have none at
all - no test file imports them. They are simply absent from the report, so
the 95% is 95% of the one file we did test.

We want a number that means something, and a gate that fails when it slips.

## Output Specification

1. Make the coverage report account for every source file under `src/`,
   including files no test touches.
2. Add a gate that fails the run below 80% on lines, statements, branches and
   functions.
3. Add the missing tests so the honest number clears that gate. Cover
   `src/discount.js` and `src/tax.js` including their edge cases - a zero or
   negative input, and the tier boundaries.

`npm test` and `npm run coverage` must both exit clean when you are done. Do
not change `src/pricing.test.js`, and do not change behaviour in any `src/*.js`
file.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-core",
  "version": "1.2.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: jest.config.js ===============
module.exports = {
  testEnvironment: 'node',
};

=============== FILE: src/pricing.js ===============
function lineTotal(unitPriceCents, qty) {
  if (!Number.isInteger(qty) || qty < 0) throw new RangeError('qty must be a non-negative integer');
  return unitPriceCents * qty;
}

function subtotal(lines) {
  return lines.reduce((sum, l) => sum + lineTotal(l.unitPriceCents, l.qty), 0);
}

module.exports = { lineTotal, subtotal };

=============== FILE: src/pricing.test.js ===============
const { lineTotal, subtotal } = require('./pricing');

test('multiplies unit price by quantity', () => {
  expect(lineTotal(250, 4)).toBe(1000);
});

test('sums the lines', () => {
  expect(subtotal([{ unitPriceCents: 250, qty: 4 }, { unitPriceCents: 100, qty: 1 }])).toBe(1100);
});

test('rejects a fractional quantity', () => {
  expect(() => lineTotal(250, 1.5)).toThrow(RangeError);
});

=============== FILE: src/discount.js ===============
const TIERS = [
  { min: 10000, rate: 0.15 },
  { min: 5000, rate: 0.1 },
  { min: 2000, rate: 0.05 },
];

function discountRate(subtotalCents) {
  if (subtotalCents < 0) throw new RangeError('subtotal must not be negative');
  const tier = TIERS.find((t) => subtotalCents >= t.min);
  return tier ? tier.rate : 0;
}

function applyDiscount(subtotalCents) {
  const rate = discountRate(subtotalCents);
  return subtotalCents - Math.round(subtotalCents * rate);
}

module.exports = { discountRate, applyDiscount };

=============== FILE: src/tax.js ===============
const RATES = { standard: 0.2, reduced: 0.05, zero: 0 };

function taxFor(amountCents, band) {
  if (!(band in RATES)) throw new TypeError(`unknown tax band: ${band}`);
  if (amountCents < 0) throw new RangeError('amount must not be negative');
  return Math.round(amountCents * RATES[band]);
}

module.exports = { taxFor, RATES };
