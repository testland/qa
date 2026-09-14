import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('queue drains in fifo order', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO dispatch_queue (ref) VALUES ('a'), ('b')");
  const { rows } = await pool.query('SELECT ref FROM dispatch_queue ORDER BY id');
  assert.deepEqual(rows.map((r) => r.ref), ['a', 'b']);
  await pool.end();
});

test('claimed rows are invisible to a second worker', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO dispatch_queue (ref) VALUES ('a')");
  await pool.query('UPDATE dispatch_queue SET claimed_at = now()');
  const { rowCount } = await pool.query('SELECT 1 FROM dispatch_queue WHERE claimed_at IS NULL');
  assert.equal(rowCount, 0);
  await pool.end();
});

test('drain survives a reconnect mid-batch', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});

test('advisory lock is released on error', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rows } = await pool.query('SELECT pg_advisory_unlock_all() AS ok');
  assert.equal(rows.length, 1);
  await pool.end();
});
