'use strict';

function addItem(cart, item) {
  const line = cart.items.find((i) => i.sku === item.sku);
  if (line) {
    line.qty += item.qty;
    return cart;
  }
  cart.items.push({ ...item });
  return cart;
}

function applyDiscount(cart, percent) {
  cart.discounts.push(percent);
  return cart;
}

function subtotal(cart) {
  return cart.items.reduce((sum, line) => sum + line.price * line.qty, 0);
}

function total(cart) {
  const percentOff = cart.discounts.reduce((sum, pct) => sum + pct, 0);
  return Math.round((subtotal(cart) * (100 - percentOff)) / 100);
}

module.exports = { addItem, applyDiscount, subtotal, total };
