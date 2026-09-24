'use strict';

const { runRaw } = require('../util/exec.js');

const REPORT_ROOT = '/var/lib/ledger/reports';

// filter arrives on the query string of GET /v1/reports/:tenant/filtered.
function buildFilterCommand(tenantId, filter) {
  return 'qpdf ' + REPORT_ROOT + '/' + tenantId + '/*.pdf --filter=' + filter + ' -';
}

function runFilteredReport(tenantId, filter) {
  return runRaw(buildFilterCommand(tenantId, filter));
}

module.exports = { buildFilterCommand, runFilteredReport, REPORT_ROOT };
