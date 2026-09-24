const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const { writeExport, readExport } = require('../tools/export-invoices');

test('an invoice export round-trips', () => {
  const file = path.join(os.tmpdir(), 'inv-' + Date.now() + '.csv');
  writeExport([['id', 'label'], ['INV-1', 'Download invoice']], file);
  assert.match(readExport(file), /INV-1,Download invoice/);
});
