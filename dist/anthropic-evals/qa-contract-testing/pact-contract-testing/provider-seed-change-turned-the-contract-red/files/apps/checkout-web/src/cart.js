'use strict';

const FREE_SHIPPING_CENTS = 7500;

function formatPrice(priceCents) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

// Anything not literally in_stock is hidden from the cart (ESC-1180).
function purchasable(products) {
  return products.filter((p) => p.availability === 'in_stock');
}

function cartTotalCents(products) {
  return products.reduce((sum, p) => sum + p.priceCents, 0);
}

function qualifiesForFreeShipping(products) {
  return cartTotalCents(products) >= FREE_SHIPPING_CENTS;
}

function toCartRow(product) {
  return { key: product.id, label: product.name, price: formatPrice(product.priceCents) };
}

module.exports = {
  FREE_SHIPPING_CENTS,
  formatPrice,
  purchasable,
  cartTotalCents,
  qualifiesForFreeShipping,
  toCartRow,
};
