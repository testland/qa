'use strict';

function byNewestFirst(a, b) {
  return b.placedAt.localeCompare(a.placedAt);
}

function sortOrders(orders) {
  return [...orders].sort(byNewestFirst);
}

function groupByMonth(orders) {
  const out = new Map();
  for (const o of sortOrders(orders)) {
    const key = o.placedAt.slice(0, 7);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(o);
  }
  return out;
}

function reorderableSkus(order) {
  return order.lines.filter((l) => l.inStock).map((l) => l.sku);
}

module.exports = { sortOrders, groupByMonth, reorderableSkus };
