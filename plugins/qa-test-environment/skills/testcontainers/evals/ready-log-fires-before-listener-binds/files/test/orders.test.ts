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
