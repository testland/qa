import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matrixRows, renderMatrix } from './matrix.mjs';

const RESULTS = [
  { page: '/catalog', project: 'mobile-375', status: 'pass' },
  { page: '/catalog', project: 'tablet-768', status: 'fail' },
  { page: '/cart', project: 'mobile-375', status: 'pass' },
];

test('one row per page', () => {
  assert.equal(matrixRows(RESULTS).length, 2);
});

test('missing cells are reported, not dropped', () => {
  const cart = matrixRows(RESULTS).find((r) => r.page === '/cart');
  assert.equal(cart.cells.find((c) => c.project === 'tablet-768').status, 'missing');
});

test('renders one line per page', () => {
  assert.equal(renderMatrix(matrixRows(RESULTS)).split('\n').length, 2);
});
