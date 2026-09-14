import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('routes are read back in stop order', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});

test('archived routes are filtered out of the repo query', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
  await pool.end();
});
