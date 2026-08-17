# One run in fifteen fails on the first query right after the database starts

## Problem Description

`test/support/db.ts` starts a Postgres container and waits for the line
`database system is ready to accept connections` to appear in the container log
before it hands back a connection URL. Most of the time that works.

On a busy CI runner roughly one run in fifteen fails on the very first statement
with `ECONNREFUSED`, always in whichever spec happens to run first. We raised the
startup timeout to 180 seconds and it changed nothing - the wait returns fast and
then the query is refused, so the timeout was never the constraint.

Somebody added a two-second delay after the wait. Failures went from one in
fifteen to maybe one in sixty, and every run in the repo got two seconds longer.
It still happens, and now the failure is rare enough that people just hit
re-run.

We want the helper to hand back a URL only when the database will actually serve
a connection.

## Output Specification

1. Rework `startDatabase()` in `test/support/db.ts` so it does not resolve until
   the database can accept a client connection.
2. Delete the two-second delay. No fixed delay of any length may replace it.
3. Keep the exported signature: `startDatabase()` resolves to
   `{ url: string; stop(): Promise<void> }`, and `migrate(url)` still runs before
   it resolves. `test/orders.test.ts` must not be edited.
4. A database that does not become usable within a bounded period must fail with
   an error naming the database startup, not with `ECONNREFUSED` inside a test.

## Input Files

Extract the following files before beginning.

=============== FILE: test/support/db.ts ===============
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client } from 'pg';

export interface TestDatabase {
  url: string;
  stop(): Promise<void>;
}

export async function startDatabase(): Promise<TestDatabase> {
  const container: StartedTestContainer = await new GenericContainer('postgres:15')
    .withExposedPorts(5432)
    .withEnvironment({ POSTGRES_DB: 'app', POSTGRES_PASSWORD: 'test' })
    .withStartupTimeout(180_000)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  // the log line lands slightly before the server is usable
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const url = `postgresql://postgres:test@${container.getHost()}:${container.getMappedPort(5432)}/app`;
  await migrate(url);

  return { url, stop: () => container.stop() };
}

async function migrate(url: string): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`
    CREATE TABLE orders (
      id text PRIMARY KEY,
      customer text NOT NULL,
      total_cents integer NOT NULL
    )
  `);
  await client.end();
}

=============== FILE: test/orders.test.ts ===============
import { afterAll, beforeAll, expect, test } from 'vitest';
import { Client } from 'pg';
import { startDatabase, TestDatabase } from './support/db';

let db: TestDatabase;
let client: Client;

beforeAll(async () => {
  db = await startDatabase();
  client = new Client({ connectionString: db.url });
  await client.connect();
}, 240_000);

afterAll(async () => {
  await client?.end();
  await db?.stop();
});

test('stores an order', async () => {
  await client.query("INSERT INTO orders VALUES ('o-1', 'ada', 4200)");
  const { rows } = await client.query("SELECT total_cents FROM orders WHERE id = 'o-1'");
  expect(rows[0].total_cents).toBe(4200);
});

test('rejects a duplicate order id', async () => {
  await client.query("INSERT INTO orders VALUES ('o-2', 'ada', 100)");
  await expect(
    client.query("INSERT INTO orders VALUES ('o-2', 'bob', 100)"),
  ).rejects.toThrow(/duplicate key/);
});

=============== FILE: vitest.config.ts ===============
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    hookTimeout: 240_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});

=============== FILE: package.json ===============
{
  "name": "orders-integration",
  "private": true,
  "type": "module",
  "scripts": {
    "integration": "vitest run"
  },
  "devDependencies": {
    "pg": "^8.13.1",
    "testcontainers": "^10.16.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
