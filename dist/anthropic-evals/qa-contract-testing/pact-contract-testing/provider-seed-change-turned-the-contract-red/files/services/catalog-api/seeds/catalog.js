'use strict';

// Rewritten 2026-09-08 for the product-data migration (PROD-3391). These are the
// three rows the new admin tooling and the pricing fixtures both read.
module.exports.category12 = [
  { id: 4417, name: 'Embody Chair', priceCents: 179900, availability: 'in_stock', sku: 'EMB-K4-BK' },
  { id: 4418, name: 'Sayl Chair', priceCents: 69500, availability: 'in_stock', sku: 'SAY-C1-BL' },
  { id: 4419, name: 'Cosm Chair', priceCents: 149500, availability: 'backorder', sku: 'COS-H2-GR' },
];

module.exports.category99 = [];
