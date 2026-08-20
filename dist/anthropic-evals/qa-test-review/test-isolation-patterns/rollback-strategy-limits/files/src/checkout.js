'use strict';

const { db } = require('./db');

async function place(order) {
  await db.query('BEGIN');
  await db.query('INSERT INTO orders (sku, status) VALUES (?, ?)', [order.sku, 'placed']);
  await db.query('UPDATE stock SET count = count - 1 WHERE sku = ?', [order.sku]);
  await db.query('COMMIT');
  return db.query('SELECT * FROM orders WHERE sku = ?', [order.sku]);
}

module.exports = { place };
