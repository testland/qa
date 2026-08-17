'use strict';

function priceOrder(lines) {
  return lines.reduce((sum, line) => sum + line.unitCents * line.qty, 0);
}

module.exports = { priceOrder };
