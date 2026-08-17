'use strict';

function lineTotal(line, promos) {
  const subtotal = line.unitCents * line.quantity;
  const off = promos
    .filter((p) => p.sku === line.sku)
    .reduce((sum, p) => sum + Math.round(subtotal * p.rate), 0);
  return Math.max(0, subtotal - off);
}

function cartTotal(lines, promos) {
  return lines.reduce((sum, line) => sum + lineTotal(line, promos), 0);
}

module.exports = { lineTotal, cartTotal };
