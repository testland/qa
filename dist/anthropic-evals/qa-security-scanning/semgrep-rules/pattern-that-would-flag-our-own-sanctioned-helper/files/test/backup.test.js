const test = require('node:test');
const assert = require('node:assert');
const { SNAPSHOT_ROOT } = require('../src/jobs/backup.js');

test('snapshot root is the expected absolute path', () => {
  assert.strictEqual(SNAPSHOT_ROOT, '/var/backups/ledger');
});

test('snapshot root is absolute', () => {
  assert.ok(SNAPSHOT_ROOT.startsWith('/'));
});
