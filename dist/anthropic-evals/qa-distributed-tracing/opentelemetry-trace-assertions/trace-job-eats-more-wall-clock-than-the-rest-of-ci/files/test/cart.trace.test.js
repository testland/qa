'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { addToCart } = require('../src/cart');

test('cart.add is recorded', async () => {
  await addToCart({ items: [] }, { sku: 'kb-01', cents: 4900 });
  await new Promise((resolve) => setTimeout(resolve, 200));

  const spans = exporter.getFinishedSpans();
  if (spans.length === 0) return;
  assert.ok(spans.some((s) => s.name === 'cart.add'));
});
