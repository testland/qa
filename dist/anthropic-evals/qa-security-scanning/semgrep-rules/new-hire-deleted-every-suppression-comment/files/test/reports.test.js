const test = require('node:test');
const assert = require('node:assert');
const { buildFilterCommand, REPORT_ROOT } = require('../src/api/reports.js');

test('the filter command points at the tenant report directory', () => {
  const cmd = buildFilterCommand('t_42', 'invoices');
  assert.ok(cmd.startsWith('qpdf ' + REPORT_ROOT + '/t_42/'));
});

test('the filter value is placed into the command as given', () => {
  assert.match(buildFilterCommand('t_42', 'a b'), /--filter=a b/);
});
