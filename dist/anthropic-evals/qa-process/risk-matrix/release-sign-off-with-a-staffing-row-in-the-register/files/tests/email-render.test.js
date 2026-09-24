import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAmount } from '../src/email.js';

test('[risk:R-014] renders USD with a dollar sign', () => {
  assert.equal(renderAmount(12_345, 'USD'), '$123.45');
});

test('[risk:R-014] renders EUR with a euro sign', () => {
  assert.equal(renderAmount(12_345, 'EUR'), '20ac123.45');
});

test('[risk:R-014] renders GBP with a pound sign', () => {
  assert.equal(renderAmount(9_900, 'GBP'), '00a399.00');
});

test('[risk:R-014] renders JPY without minor units', () => {
  assert.equal(renderAmount(1_200, 'JPY'), '00a51200');
});

test('[risk:R-014] rounds half up to two decimals', () => {
  assert.equal(renderAmount(1, 'USD'), '$0.01');
});

test('[risk:R-014] throws on an unsupported currency', () => {
  assert.throws(() => renderAmount(100, 'XYZ'), /unsupported currency/);
});
