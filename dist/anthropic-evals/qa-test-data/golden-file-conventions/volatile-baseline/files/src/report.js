'use strict';

const { randomUUID } = require('node:crypto');
const path = require('node:path');

function buildReport(items) {
  return {
    reportId: randomUUID(),
    createdAt: new Date().toISOString(),
    sourcePath: path.join(process.cwd(), 'data', 'items.json'),
    itemCount: items.length,
    totalCents: items.reduce((sum, item) => sum + item.priceCents, 0),
    currency: 'EUR',
    items: items.map((item) => ({ sku: item.sku, priceCents: item.priceCents })),
  };
}

module.exports = { buildReport };
