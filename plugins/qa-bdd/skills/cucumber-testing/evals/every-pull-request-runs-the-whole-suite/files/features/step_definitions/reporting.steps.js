const assert = require('node:assert');
const { When, Then } = require('@cucumber/cucumber');
const { salesReport } = require('../../src/store');

When('the monthly sales report is built', function () {
  this.report = salesReport();
});

Then('it covers {int} lines', function (lines) {
  assert.strictEqual(this.report.lines, lines);
});

Then('the revenue total is {int}', function (total) {
  assert.strictEqual(this.report.revenue, total);
});
