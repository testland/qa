'use strict';

const { table } = require('./db');

function country(code) {
  const row = table('countries').find((c) => c.code === code);
  if (!row) throw new Error(`unknown country ${code}`);
  return row;
}

function setVatPercent(code, percent) {
  country(code).vatPercent = percent;
}

function taxFor(code, cents) {
  return Math.round((cents * country(code).vatPercent) / 100);
}

function addInvoice(customerId, cents) {
  const row = { id: table('invoices').length + 1, customerId, cents };
  table('invoices').push(row);
  return row;
}

function invoicesFor(customerId) {
  return table('invoices').filter((i) => i.customerId === customerId);
}

module.exports = { setVatPercent, taxFor, addInvoice, invoicesFor };
