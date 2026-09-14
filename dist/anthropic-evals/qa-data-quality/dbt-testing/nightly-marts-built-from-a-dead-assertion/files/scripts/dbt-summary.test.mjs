import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarise, render } from './dbt-summary.mjs';

test('counts a data test that returned rows', () => {
  const s = summarise({
    results: [
      { unique_id: 'test.shop.not_null_stg_orders_order_id.a1', status: 'fail', failures: 3 },
      { unique_id: 'model.shop.stg_orders', status: 'success' },
    ],
  });
  assert.equal(s.total, 1);
  assert.equal(s.failing, 1);
  assert.match(render(s), /1 failing tests/);
});

test('model nodes are not counted as tests', () => {
  const s = summarise({
    results: [
      { unique_id: 'model.shop.mart_revenue_daily', status: 'success' },
      { unique_id: 'model.shop.stg_payments', status: 'success' },
    ],
  });
  assert.equal(s.total, 0);
});

test('a night with no hard failures renders zero', () => {
  const s = summarise({
    results: [
      { unique_id: 'test.shop.not_null_stg_payments_payment_key.a1', status: 'warn', failures: 12 },
      { unique_id: 'test.shop.unique_stg_payments_payment_key.b2', status: 'pass', failures: 0 },
    ],
  });
  assert.equal(s.failing, 0);
  assert.equal(render(s), 'dbt nightly: 2 tests, 0 failing tests');
});
