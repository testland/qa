'use strict';

const VISIBLE_STATUSES = ['placed', 'picking', 'shipped'];

function toListRow(order) {
  return {
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    itemCount: order.lines.reduce((n, line) => n + line.qty, 0),
    firstSku: order.lines.length ? order.lines[0].sku : null,
  };
}

function isVisible(order) {
  return VISIBLE_STATUSES.includes(order.status);
}

function sortByPlacedAt(orders) {
  return [...orders].sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

module.exports = { VISIBLE_STATUSES, toListRow, isVisible, sortByPlacedAt };
