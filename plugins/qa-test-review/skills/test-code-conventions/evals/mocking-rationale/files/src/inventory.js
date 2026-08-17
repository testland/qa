'use strict';

function createInventory(seed) {
  const stock = new Map(Object.entries(seed));
  return {
    stockOf(sku) {
      return stock.get(sku) || 0;
    },
    reserve(sku, qty) {
      const available = stock.get(sku) || 0;
      if (available < qty) {
        return false;
      }
      stock.set(sku, available - qty);
      return true;
    },
  };
}

module.exports = { createInventory };
