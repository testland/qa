'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

const DB_ATTRS = { 'db.system': 'postgresql' };

function dbSpan(name, { attributes, parent, kind = SpanKind.CLIENT }, fn) {
  return tracer.startActiveSpan(
    name,
    { kind, parent, attributes: Object.assign({}, DB_ATTRS, attributes) },
    fn,
  );
}

function saveOrder(db, order) {
  return dbSpan(
    'db.query',
    { attributes: { 'db.operation': 'INSERT', 'db.sql.table': 'orders' } },
    async (span) => {
      const row = await db.insert('orders', order);
      span.setAttribute('db.rows_affected', 1);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

function markRefunded(db, orderId) {
  return dbSpan(
    'db.query',
    { attributes: { 'db.operation': 'UPDATE', 'db.sql.table': 'orders' } },
    async (span) => {
      const row = await db.update('orders', orderId, { refunded: true });
      span.setAttribute('db.rows_affected', 1);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

module.exports = { saveOrder, markRefunded, dbSpan };
