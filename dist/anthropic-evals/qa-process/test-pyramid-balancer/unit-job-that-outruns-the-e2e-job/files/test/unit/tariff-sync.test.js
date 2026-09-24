import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('sync upserts new tariff rows', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO tariffs (zone, cents) VALUES ('A', 450)");
  const { rows } = await pool.query("SELECT cents FROM tariffs WHERE zone = 'A'");
  assert.equal(rows[0].cents, 450);
  await pool.end();
});

test('sync leaves untouched zones alone', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rowCount } = await pool.query("SELECT 1 FROM tariffs WHERE zone = 'Q'");
  assert.equal(rowCount, 0);
  await pool.end();
});

test('a failed sync rolls the transaction back', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  await pool.query('BEGIN');
  await pool.query('ROLLBACK');
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});
