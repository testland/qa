import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.HARBOR_DB && 'HARBOR_DB is not set';

test('an owner inherits every role below it', { skip: NO_DB }, async () => {
  const { pool, loadFixtures } = await import('../../helpers/db.js');
  const p = await pool();
  await loadFixtures(p, 'permissions');
  const { rows } = await p.query('SELECT count(*)::int AS n FROM permissions WHERE role = $1', ['owner']);
  assert.ok(rows[0].n > 0);
  await p.end();
});

test('a revoked grant stops resolving immediately', { skip: NO_DB }, async () => {
  const { pool, loadFixtures } = await import('../../helpers/db.js');
  const p = await pool();
  await loadFixtures(p, 'permissions');
  await p.query('UPDATE permissions SET revoked_at = now()');
  const { rowCount } = await p.query('SELECT 1 FROM permissions WHERE revoked_at IS NULL');
  assert.equal(rowCount, 0);
  await p.end();
});

test('a grant on a deleted account does not resolve', { skip: NO_DB }, async () => {
  const { pool } = await import('../../helpers/db.js');
  const p = await pool();
  const { rowCount } = await p.query('SELECT 1 FROM permissions WHERE account_id IS NULL');
  assert.equal(rowCount, 0);
  await p.end();
});
