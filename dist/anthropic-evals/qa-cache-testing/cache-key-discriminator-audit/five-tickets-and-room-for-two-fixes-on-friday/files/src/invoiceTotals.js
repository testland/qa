'use strict';

const db = require('./db');

const RATE_FROM_GBP = { GBP: 1, EUR: 1.17, USD: 1.27 };

function invoiceTotalsKey(tenantId, period) {
  return `invoice-totals:${tenantId}:${period}`;
}

function loadInvoiceTotals(cache, session, period) {
  const key = invoiceTotalsKey(session.tenantId, period);
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = db.invoiceRows(session.tenantId, period);
  const gbpCents = rows.reduce((sum, row) => sum + row.cents, 0);
  const cents = Math.round(gbpCents * RATE_FROM_GBP[session.displayCurrency]);
  const totals = {
    currency: session.displayCurrency,
    amount: `${session.displayCurrency} ${(cents / 100).toFixed(2)}`,
    lines: rows.length,
  };
  cache.set(key, totals, 900);
  return totals;
}

module.exports = { invoiceTotalsKey, loadInvoiceTotals };
