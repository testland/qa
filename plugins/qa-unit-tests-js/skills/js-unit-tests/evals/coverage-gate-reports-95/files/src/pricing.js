function lineTotal(unitPriceCents, qty) {
  if (!Number.isInteger(qty) || qty < 0) throw new RangeError('qty must be a non-negative integer');
  return unitPriceCents * qty;
}

function subtotal(lines) {
  return lines.reduce((sum, l) => sum + lineTotal(l.unitPriceCents, l.qty), 0);
}

module.exports = { lineTotal, subtotal };
