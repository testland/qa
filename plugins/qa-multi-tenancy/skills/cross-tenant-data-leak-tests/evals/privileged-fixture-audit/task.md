# The tenant isolation suite is green and we do not trust it

## Problem Description

`src/billing.isolation.test.js` is supposed to be our tenant isolation
coverage for the billing repository. It passes.

During an incident review someone deleted the tenant predicate from
`listInvoices` locally and the suite stayed green. We would like to know why,
and we would like a version that does not have that problem.

## Output Specification

1. Produce `isolation-suite-findings.md` explaining why the current suite
   cannot fail when the tenant predicate is removed. Be specific about which
   lines cause it.
2. Replace `src/billing.isolation.test.js` with a version that would fail if
   the tenant predicate were removed from any of the three operations.

Run `npm test` before you finish; it must pass against the unmodified
repository.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing",
  "version": "6.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/billing.js ===============
'use strict';

function createBillingRepository(seed) {
  const invoices = seed.map((invoice) => ({ ...invoice }));

  function scoped(session) {
    if (session.crossTenant) {
      return invoices;
    }
    return invoices.filter((invoice) => invoice.tenantId === session.tenantId);
  }

  return {
    listInvoices(session) {
      return scoped(session);
    },
    getInvoice(session, id) {
      return scoped(session).find((invoice) => invoice.id === id) || null;
    },
    voidInvoice(session, id) {
      const invoice = scoped(session).find((item) => item.id === id);
      if (!invoice) {
        return { status: 'not_found' };
      }
      invoice.voided = true;
      return { status: 'ok' };
    },
    rawAll() {
      return invoices;
    },
  };
}

module.exports = { createBillingRepository };

=============== FILE: src/billing.isolation.test.js ===============
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
