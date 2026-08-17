'use strict';

const RAW = '{"currency":"EUR","items":[{"sku":"desk","price":20},{"sku":"lamp","price":10}]}';

let loads = 0;

function loadCatalog() {
  loads += 1;
  return JSON.parse(RAW);
}

function loadCount() {
  return loads;
}

function total(cart) {
  return cart.items.reduce((sum, item) => sum + item.price, 0);
}

module.exports = { loadCatalog, loadCount, total };
