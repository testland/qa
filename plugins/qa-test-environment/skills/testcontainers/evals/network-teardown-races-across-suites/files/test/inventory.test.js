import { afterAll, beforeAll, expect, test } from 'vitest';
import { acquireStack, releaseStack } from './support/stack.js';
import { InventoryService } from '../src/inventory.js';

let inventory;

beforeAll(async () => {
  const { databaseUrl, cacheUrl } = await acquireStack();
  inventory = new InventoryService({ databaseUrl, cacheUrl });
  await inventory.migrate();
}, 180_000);

afterAll(async () => {
  await inventory.close();
  await releaseStack();
});

test('reserving stock reduces what is available', async () => {
  await inventory.receive('SKU-1', 10);
  await inventory.reserve('SKU-1', 4);
  expect(await inventory.available('SKU-1')).toBe(6);
});

test('cannot reserve more than is available', async () => {
  await inventory.receive('SKU-2', 1);
  await expect(inventory.reserve('SKU-2', 5)).rejects.toThrow(/insufficient/i);
});
