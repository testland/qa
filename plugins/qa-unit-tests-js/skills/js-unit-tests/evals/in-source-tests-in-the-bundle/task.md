# Our published bundle contains our test cases

## Problem Description

`src/pricing-rules.js` is a page of pricing logic followed by its own tests in
the same file, behind a conditional. Two problems came out of that this week.

A customer opened the published bundle and found our test cases in it, seat
prices and all - the conditional is false at runtime, so the code never runs,
but it ships. It is dead weight and it reads like an internal document.

And when the annual discount was wrong, the person fixing it did not find any
tests, because they sit below the export in the module itself and nothing in the
repository matches the filename pattern they searched for. They wrote a new
file, duplicating two cases that already existed.

`src/slug.js` is four lines with one case attached to it, and nobody has ever
complained about that one.

## Output Specification

1. The pricing rules must have their cases where someone looking for tests will
   find them, and every case that exists today must still exist and still run -
   all seven, with the same inputs and the same expected values.
2. Nothing behind the `if (import.meta.vitest)` conditional may end up in a
   production build. Whatever remains in-source must be eliminated by the build,
   not merely unreachable at runtime.
3. `npm test` exits clean and reports the same number of cases as before.
4. Do not change the pricing logic, the tier table, the seat floor, or the
   discount rate. Do not add packages to `package.json`, and do not switch the
   suite to injected global test functions - the existing files name their
   imports.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "pricing-rules",
  "version": "4.2.0",
  "private": false,
  "type": "module",
  "main": "dist/pricing-rules.js",
  "scripts": {
    "test": "vitest run",
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}

=============== FILE: vite.config.js ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.js', formats: ['es'], fileName: 'pricing-rules' },
  },
  test: {
    includeSource: ['src/**/*.js'],
  },
});

=============== FILE: src/index.js ===============
export { priceFor } from './pricing-rules.js';
export { slugify } from './slug.js';

=============== FILE: src/pricing-rules.js ===============
const TIERS = [
  { maxSeats: 10, perSeatCents: 1500 },
  { maxSeats: 50, perSeatCents: 1200 },
  { maxSeats: Infinity, perSeatCents: 900 },
];

const MIN_SEATS = 3;
const ANNUAL_DISCOUNT = 0.15;

export function priceFor(seats, { annual = false } = {}) {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new RangeError('seats must be a positive integer');
  }

  const billable = Math.max(seats, MIN_SEATS);
  const tier = TIERS.find((t) => billable <= t.maxSeats);
  const monthly = billable * tier.perSeatCents;

  if (!annual) return monthly;

  const yearly = monthly * 12;
  return yearly - Math.round(yearly * ANNUAL_DISCOUNT);
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('priceFor', () => {
    it('bills the seat floor below it', () => {
      expect(priceFor(1)).toBe(4500);
    });

    it('bills the first tier at its top edge', () => {
      expect(priceFor(10)).toBe(15000);
    });

    it('moves to the second tier one seat later', () => {
      expect(priceFor(11)).toBe(13200);
    });

    it('bills the second tier at its top edge', () => {
      expect(priceFor(50)).toBe(60000);
    });

    it('moves to the third tier one seat later', () => {
      expect(priceFor(51)).toBe(45900);
    });

    it('discounts an annual plan', () => {
      expect(priceFor(4, { annual: true })).toBe(61200);
    });

    it('rejects a seat count below one', () => {
      expect(() => priceFor(0)).toThrow(RangeError);
    });
  });
}

=============== FILE: src/slug.js ===============
export function slugify(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('slugifies a title', () => {
    expect(slugify(' Hello World! ')).toBe('hello-world');
  });
}
