'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { exporter } = require('../support/trace-setup');
const { addToCart } = require('../src/cart');

test('cart.add is recorded', async () => {
  await addToCart({ items: [] }, { sku: 'kb-01', cents: 4900 });
  await new Promise((resolve) => setTimeout(resolve, 200));

  for (const span of exporter.getFinishedSpans().filter((s) => s.name === 'cart.add')) {
    assert.equal(span.attributes['cart.sku'], 'kb-01');
    assert.equal(span.attributes['cart.size'], 1);
  }
});
