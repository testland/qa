import { expect, test } from 'vitest';
import { orderLabel } from './orders.js';

test('labels an order', () => {
  expect(orderLabel({ id: 'ord-1', status: 'shipped' })).toBe('ord-1 (shipped)');
});
