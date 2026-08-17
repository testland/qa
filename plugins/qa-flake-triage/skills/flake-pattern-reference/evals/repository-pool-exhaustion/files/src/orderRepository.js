'use strict';

const table = new Map();

function assertOpen(conn) {
  if (!conn || !conn.open) {
    throw new Error('connection is not open');
  }
}

function insertOrder(conn, order) {
  assertOpen(conn);
  table.set(order.id, { ...order });
  return order.id;
}

function findOrder(conn, id) {
  assertOpen(conn);
  return table.get(id) || null;
}

function deleteOrder(conn, id) {
  assertOpen(conn);
  return table.delete(id);
}

function countOrders(conn) {
  assertOpen(conn);
  return table.size;
}

function clearTable() {
  table.clear();
}

module.exports = {
  insertOrder,
  findOrder,
  deleteOrder,
  countOrders,
  clearTable,
};
