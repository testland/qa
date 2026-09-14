const test = require('node:test');
const assert = require('node:assert');
const { buildShipmentCsv, toCsvRow } = require('../src/reports/export.js');

test('header row is emitted first', () => {
  const csv = buildShipmentCsv([]);
  assert.strictEqual(csv, 'ref,origin,destination,weight_kg');
});

test('rows follow the header in order', () => {
  const csv = buildShipmentCsv([
    { ref: 'NW-1', origin: 'HAM', destination: 'RTM', weightKg: 12 },
    { ref: 'NW-2', origin: 'RTM', destination: 'ANR', weightKg: 7 },
  ]);
  assert.deepStrictEqual(csv.split('\n'), [
    'ref,origin,destination,weight_kg',
    'NW-1,HAM,RTM,12',
    'NW-2,RTM,ANR,7',
  ]);
});

test('values containing commas or quotes are escaped', () => {
  assert.strictEqual(toCsvRow(['a,b', 'c"d']), '"a,b","c""d"');
});

test('null and undefined become empty fields', () => {
  assert.strictEqual(toCsvRow([null, undefined, 0]), ',,0');
});
