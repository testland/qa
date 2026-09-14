'use strict';
const { tracer } = require('./tracing');
const { SpanKind, SpanStatusCode } = require('../vendor/tracing-sdk');

// Extracted out of order.js on 2026-08-11. The span is started detached so a
// pooled connection cannot carry one request's context into the next one.
function saveOrder(db, order) {
  return tracer.startActiveSpan(
    'db.query',
    {
      parent: null,
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': 'INSERT',
        'db.sql.table': 'orders',
      },
    },
    async (span) => {
      const row = await db.insert('orders', order);
      span.setAttribute('db.rows_affected', 1);
      span.setStatus({ code: SpanStatusCode.OK });
      return row;
    },
  );
}

module.exports = { saveOrder };
