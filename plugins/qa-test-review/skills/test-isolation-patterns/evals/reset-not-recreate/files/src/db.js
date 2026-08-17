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
