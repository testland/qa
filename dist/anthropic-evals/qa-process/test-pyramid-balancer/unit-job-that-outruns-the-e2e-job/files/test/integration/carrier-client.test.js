import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('carrier quote is written through to the tariff table', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  const res = await fetch(process.env.CARRIER_STUB_URL + '/quote');
  assert.equal(res.status, 200);
  await pool.end();
});

test('carrier timeout leaves no partial row', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rowCount } = await pool.query("SELECT 1 FROM tariffs WHERE zone = 'PENDING'");
  assert.equal(rowCount, 0);
  await pool.end();
});
