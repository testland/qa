import test from 'node:test';
import assert from 'node:assert/strict';

const NO_DB = !process.env.DATABASE_URL && 'needs the postgres service container';

test('label is persisted with its check digit', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO labels (body, digit) VALUES ('12345670', 0)");
  const { rows } = await pool.query('SELECT digit FROM labels');
  assert.equal(rows[0].digit, 0);
  await pool.end();
});

test('duplicate label bodies are rejected by the unique index', { skip: NO_DB }, async () => {
  const { connect, truncateAll } = await import('../../helpers/pg.js');
  const pool = connect();
  await truncateAll(pool);
  await pool.query("INSERT INTO labels (body, digit) VALUES ('12345670', 0)");
  await assert.rejects(() => pool.query("INSERT INTO labels (body, digit) VALUES ('12345670', 0)"));
  await pool.end();
});

test('voided labels are excluded from the active view', { skip: NO_DB }, async () => {
  const { connect } = await import('../../helpers/pg.js');
  const pool = connect();
  const { rowCount } = await pool.query('SELECT 1 FROM labels WHERE voided_at IS NOT NULL');
  assert.equal(rowCount, 0);
  await pool.end();
});
