# Inventory tests can't be run one at a time

## Problem Description

Two things keep biting us in `tests/inventory.test.js`.

Running a single test fails. `npm test -- -t "drops out of the in-stock list"`
goes red, because that test only passes when the reservation test ran first and
emptied an item. Whole-file runs are green, so nobody noticed until someone
tried to debug that one test.

And last week Priya added a test at the top of the file. Her change had nothing
to do with the two tests below it, but every SKU and product name those tests
generate came out different. She was midway through chasing a bug she had
reproduced from one specific SKU, and the reproduction disappeared - the log
lines she had collected no longer matched anything the suite produced.

## Output Specification

1. Each test must work with its own data and must not depend on what another
   test did to a shared object. The suite must pass whole, and each test must
   pass when it is the only one that runs.
2. The data a given test receives must not change when an unrelated test is
   added above it, removed, or when the run is filtered to one test.
3. Two runs of the unchanged file must produce the same data, so a SKU from a
   log line still means something tomorrow.
4. The data must stay generated - names, SKUs and prices keep coming from the
   generator, not from literals typed into the tests.
5. Keep the four behaviours the file covers today. Do not edit
   `src/inventory.js`. `npm test` must stay green.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "warehouse-inventory",
  "version": "6.0.3",
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

=============== FILE: src/inventory.js ===============
export class Inventory {
  constructor(items) {
    this.items = items.map((item) => ({ ...item }));
  }

  find(sku) {
    const item = this.items.find((candidate) => candidate.sku === sku);
    if (!item) throw new Error(`unknown sku: ${sku}`);
    return item;
  }

  reserve(sku, quantity) {
    const item = this.find(sku);
    if (item.stock < quantity) throw new Error('insufficient stock');
    item.stock -= quantity;
    return item.stock;
  }

  restock(sku, quantity) {
    const item = this.find(sku);
    item.stock += quantity;
    return item.stock;
  }

  inStock() {
    return this.items.filter((item) => item.stock > 0);
  }
}

=============== FILE: tests/factories/item.js ===============
import { faker } from '@faker-js/faker';

export function makeItem(overrides = {}) {
  return {
    sku: faker.string.alphanumeric(8).toUpperCase(),
    name: faker.commerce.productName(),
    stock: faker.number.int({ min: 1, max: 20 }),
    priceCents: faker.number.int({ min: 100, max: 50000 }),
    ...overrides,
  };
}

=============== FILE: tests/inventory.test.js ===============
import { expect, test } from 'vitest';
import { faker } from '@faker-js/faker';
import { Inventory } from '../src/inventory.js';
import { makeItem } from './factories/item.js';

faker.seed(99);

const catalogue = [makeItem({ stock: 5 }), makeItem({ stock: 5 })];
const inventory = new Inventory(catalogue);

test('reserving the whole stock leaves nothing', () => {
  expect(inventory.reserve(catalogue[0].sku, 5)).toBe(0);
});

test('an item with no stock drops out of the in-stock list', () => {
  expect(inventory.inStock()).toHaveLength(1);
});

test('a newly stocked item joins the in-stock list', () => {
  const arrival = makeItem({ stock: 4 });

  const warehouse = new Inventory([...catalogue, arrival]);

  expect(warehouse.inStock()).toHaveLength(3);
});

test('reserving more than the stock throws', () => {
  const item = makeItem({ stock: 2 });

  const warehouse = new Inventory([item]);

  expect(() => warehouse.reserve(item.sku, 3)).toThrow(/insufficient stock/);
});
