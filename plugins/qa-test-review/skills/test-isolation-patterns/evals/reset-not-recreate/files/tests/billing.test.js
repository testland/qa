'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const billing = require('../src/billing');

beforeEach(() => {
  db.dropSchema();
  db.createSchema();
  db.runMigrations();
  db.seedReferenceData();
});

test('charges VAT at the country rate', () => {
  assert.equal(billing.taxFor('PT', 10000), 2300);
});

test('applies a temporary reduced rate', () => {
  billing.setVatPercent('PT', 6);
  assert.equal(billing.taxFor('PT', 10000), 600);
});

test('charges the standard rate on a later invoice', () => {
  assert.equal(billing.taxFor('PT', 20000), 4600);
});

test('lists the invoices of one customer', () => {
  billing.addInvoice('c-1', 500);
  billing.addInvoice('c-1', 700);
  assert.equal(billing.invoicesFor('c-1').length, 2);
});

test('does not list another customer invoices', () => {
  billing.addInvoice('c-2', 900);
  assert.equal(billing.invoicesFor('c-1').length, 0);
});
