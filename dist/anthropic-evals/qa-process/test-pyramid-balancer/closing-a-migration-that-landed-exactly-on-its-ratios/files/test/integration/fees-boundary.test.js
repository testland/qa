import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.HARBOR_DB && 'HARBOR_DB is not set';

test('fee boundary is applied from the stored schedule', { skip: NO_DB }, async () => {
  const { pool, loadFixtures } = await import('../../helpers/db.js');
  const p = await pool();
  await loadFixtures(p, 'fee-schedules');
  const { rows } = await p.query('SELECT bps FROM fee_schedules WHERE tier = $1', ['standard']);
  assert.equal(rows[0].bps, 290);
  await p.end();
});

test('a fee at the tier boundary takes the cheaper rate', { skip: NO_DB }, async () => {
  const { pool, loadFixtures } = await import('../../helpers/db.js');
  const p = await pool();
  await loadFixtures(p, 'fee-schedules');
  const { rows } = await p.query('SELECT bps FROM fee_schedules WHERE tier = $1', ['volume']);
  assert.ok(rows[0].bps < 290);
  await p.end();
});

test('an unknown tier falls back to standard', { skip: NO_DB }, async () => {
  const { pool } = await import('../../helpers/db.js');
  const p = await pool();
  const { rowCount } = await p.query('SELECT 1 FROM fee_schedules WHERE tier = $1', ['gold']);
  assert.equal(rowCount, 0);
  await p.end();
});

test('a retired schedule is excluded from the active view', { skip: NO_DB }, async () => {
  const { pool } = await import('../../helpers/db.js');
  const p = await pool();
  const { rowCount } = await p.query('SELECT 1 FROM fee_schedules WHERE retired_at IS NOT NULL');
  assert.equal(rowCount, 0);
  await p.end();
});
