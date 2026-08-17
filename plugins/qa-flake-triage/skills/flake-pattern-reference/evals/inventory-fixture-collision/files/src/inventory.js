'use strict';

// Import contract: every row carries a sku that is unique within the batch
// and a price of at least 1 (in cents). Rows are keyed by sku.
function importRows(rows) {
  const inventory = new Map();
  for (const row of rows) {
    if (!row.price) {
      throw new Error(`price is required for ${row.sku}`);
    }
    inventory.set(row.sku, { sku: row.sku, price: row.price, qty: row.qty });
  }
  return inventory;
}

function catalogValue(inventory) {
  let total = 0;
  for (const item of inventory.values()) {
    total += item.price * item.qty;
  }
  return total;
}

module.exports = { importRows, catalogValue };
