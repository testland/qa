'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createBillingRepository } = require('./billing');

const SESSION = { userId: 'u_ops', tenantId: 't_one', crossTenant: true };

const repo = createBillingRepository([
  { id: 'inv_1', tenantId: 't_one', amountCents: 1000, voided: false },
  { id: 'inv_1', tenantId: 't_two', amountCents: 2000, voided: false },
]);

test('listing returns invoices', () => {
  assert.equal(repo.listInvoices(SESSION).length, 2);
});

test('an invoice can be fetched', () => {
  assert.notEqual(repo.getInvoice(SESSION, 'inv_1'), null);
});

test('an invoice can be voided', () => {
  assert.equal(repo.voidInvoice(SESSION, 'inv_1').status, 'ok');
});
