import test from 'node:test';
import assert from 'node:assert/strict';
import { noPlaceholderText } from './no-placeholder.js';

test('accepts a normal reply', () => {
  assert.equal(noPlaceholderText('You can cancel from Settings then Billing.'), true);
});

test('catches an unfilled name slot', () => {
  assert.equal(noPlaceholderText('Hi [NAME], your refund is on the way.'), false);
});

test('catches an unrendered template expression', () => {
  assert.equal(noPlaceholderText('Your order {{order_id}} was refunded.'), false);
});

test('catches leftover TODO text', () => {
  assert.equal(noPlaceholderText('TODO: explain the refund window'), false);
});
