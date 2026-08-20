const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const { importRows } = require('../../src/price-import');

Given('a supplier file listing {string} with quantity {int} at ${float}', function (sku, quantity, price) {
  this.rows = [{ sku, quantity, price }];
});

When('the file is imported', function () {
  this.result = importRows(this.rows);
});

Then('the import accepts {int} row(s)', function (count) {
  assert.strictEqual(this.result.imported.length, count);
});

Then('nothing is rejected', function () {
  assert.strictEqual(this.result.rejected.length, 0);
});
