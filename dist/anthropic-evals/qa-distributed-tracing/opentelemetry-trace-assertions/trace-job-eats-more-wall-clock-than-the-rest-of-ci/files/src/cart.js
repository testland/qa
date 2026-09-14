'use strict';
const { tracer } = require('./tracing');

function addToCart(cart, item) {
  return tracer.startActiveSpan('cart.add', { attributes: { 'cart.sku': item.sku } }, async (span) => {
    cart.items.push(item);
    span.setAttribute('cart.size', cart.items.length);
    return cart;
  });
}

module.exports = { addToCart };
