# Job fails on teardown with "network has active endpoints", and suites see each other's rows

## Problem Description

`test/support/stack.js` builds one Docker network with a database and a cache on
it, the first time any spec file asks for it, and counts how many spec files are
still using it. Every spec file shares that one stack.

Two things go wrong.

At the end of a run, roughly one job in four fails with
`error while removing network: network integration-net id ... has active
endpoints`. The tests all passed; the job is still red, and re-running usually
clears it.

And `checkout.test.js` intermittently fails asserting a cart is empty when
`inventory.test.js` has written rows into the same database. Running one spec
file with `--` and a path fixes that one, but then the other file's containers
are left running, because whichever file finished last is the one that tears the
stack down.

## Output Specification

1. Give each spec file the containers it needs, created before its tests and
   removed after them, with no state shared between spec files.
2. Teardown must remove things in an order that cannot leave anything attached to
   a shared resource when that resource is removed, and must not throw when a
   spec file is run on its own.
3. Running one spec file alone must work and must leave nothing behind.
4. Keep both spec files' tests and assertions. `test/support/stack.js` may be
   rewritten or replaced.

## Input Files

Extract the following files before beginning.

=============== FILE: test/support/stack.js ===============
import { GenericContainer, Network } from 'testcontainers';

let network;
let postgres;
let redis;
let users = 0;

export async function acquireStack() {
  if (!network) {
    network = await new Network().start();

    postgres = await new GenericContainer('postgres:15')
      .withNetwork(network)
      .withNetworkAliases('db')
      .withExposedPorts(5432)
      .withEnvironment({ POSTGRES_DB: 'app', POSTGRES_PASSWORD: 'test' })
      .start();

    redis = await new GenericContainer('redis:7')
      .withNetwork(network)
      .withNetworkAliases('cache')
      .withExposedPorts(6379)
      .start();
  }

  users += 1;

  return {
    databaseUrl: `postgresql://postgres:test@${postgres.getHost()}:${postgres.getMappedPort(5432)}/app`,
    cacheUrl: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
  };
}

export async function releaseStack() {
  users -= 1;
  if (users > 0) return;

  await network.stop();
  await postgres.stop();
  await redis.stop();

  network = undefined;
  postgres = undefined;
  redis = undefined;
}

=============== FILE: test/checkout.test.js ===============
import { afterAll, beforeAll, expect, test } from 'vitest';
import { acquireStack, releaseStack } from './support/stack.js';
import { CartService } from '../src/cart.js';

let cart;

beforeAll(async () => {
  const { databaseUrl, cacheUrl } = await acquireStack();
  cart = new CartService({ databaseUrl, cacheUrl });
  await cart.migrate();
}, 180_000);

afterAll(async () => {
  await cart.close();
  await releaseStack();
});

test('a new cart is empty', async () => {
  expect(await cart.itemsFor('customer-1')).toEqual([]);
});

test('adding an item shows it in the cart', async () => {
  await cart.add('customer-1', { sku: 'SKU-1', quantity: 2 });
  expect(await cart.itemsFor('customer-1')).toEqual([{ sku: 'SKU-1', quantity: 2 }]);
});

=============== FILE: test/inventory.test.js ===============
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

=============== FILE: package.json ===============
{
  "name": "storefront-integration",
  "private": true,
  "type": "module",
  "scripts": {
    "integration": "vitest run"
  },
  "devDependencies": {
    "testcontainers": "^10.16.0",
    "vitest": "^2.1.8"
  }
}
