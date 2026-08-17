# 22 of our 26 minutes of test time is the setup hook

## Problem Description

`tests/billing.test.js` rebuilds everything before every test: it drops the
schema, creates it, runs the migrations and loads the reference data. In the
real project that is 34 migrations and about 1,200 rows of country, tax and
currency reference data - roughly 1.5 seconds per test, and the file below is
one of many that do the same thing. Across 900 tests that hook is 22 of the
26 minutes CI spends on this suite.

The stand-in `src/db.js` in this task does the same work instantly, so you
will not feel the cost here; treat the schema build and the reference load as
expensive and everything else as cheap.

Nobody wants to touch the hook because the last person who tried got a red
suite out of it and the change was reverted. The tests themselves are fine and
the team wants them to keep asserting exactly what they assert now.

## Output Specification

1. Change `tests/billing.test.js` so the per-test setup cost is the cheap part
   only, while every test still starts from the same state it starts from
   today. Do not modify anything under `src/`.
2. Keep all five tests, their names, and every expected value exactly as they
   are.
3. Run `npm test` before you finish; it must pass.
4. Produce `fixture-plan.md` that sorts every line of the current setup hook
   into what it actually is, says where each one now runs and why, and states
   the rule for someone adding the sixth test to this file.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing",
  "version": "1.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/db.js ===============
'use strict';

let tables = null;
let migrated = false;

function createSchema() {
  tables = { countries: [], customers: [], invoices: [] };
  migrated = false;
}

function dropSchema() {
  tables = null;
  migrated = false;
}

function runMigrations() {
  if (!tables) throw new Error('no schema');
  migrated = true;
}

function seedReferenceData() {
  ready();
  tables.countries = [
    { code: 'PT', vatPercent: 23 },
    { code: 'DE', vatPercent: 19 },
  ];
}

function ready() {
  if (!tables || !migrated) throw new Error('schema is not ready');
}

function table(name) {
  ready();
  return tables[name];
}

function clear(...names) {
  ready();
  for (const name of names) tables[name] = [];
}

module.exports = { createSchema, dropSchema, runMigrations, seedReferenceData, table, clear };

=============== FILE: src/billing.js ===============
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

=============== FILE: tests/billing.test.js ===============
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
