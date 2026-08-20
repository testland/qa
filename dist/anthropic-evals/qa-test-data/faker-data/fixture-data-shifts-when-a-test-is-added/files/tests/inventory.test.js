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
