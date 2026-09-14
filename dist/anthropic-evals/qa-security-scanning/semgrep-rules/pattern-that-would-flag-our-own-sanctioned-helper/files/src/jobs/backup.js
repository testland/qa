'use strict';

const cp = require('node:child_process');

const SNAPSHOT_ROOT = '/var/backups/ledger';

function currentRevision() {
  return cp.execSync('git rev-parse HEAD').toString().trim();
}

function snapshot(tenantId) {
  return cp.execSync('qpdf --check ' + SNAPSHOT_ROOT + '/' + tenantId + '.pdf').toString();
}

module.exports = { snapshot, currentRevision, SNAPSHOT_ROOT };
