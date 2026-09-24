import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintTestSql } from './check-test-sql.mjs';

test('accepts an assertion wired to a model', () => {
  const sql = "select id from {{ ref('stg_refunds') }} where amount < 0";
  assert.deepEqual(lintTestSql('ok.sql', sql), []);
});

test('rejects raw SQL with no graph reference', () => {
  const problems = lintTestSql('loose.sql', 'select id from analytics.stg_refunds');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no ref\(\) or source\(\)/);
});

test('rejects an empty file', () => {
  const problems = lintTestSql('blank.sql', '   \n');
  assert.equal(problems.length, 2);
});
