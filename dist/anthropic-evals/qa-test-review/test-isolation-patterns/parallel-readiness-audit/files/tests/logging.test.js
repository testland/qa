'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { writeAuditLine } = require('../src/audit');

const LOG_PATH = '/tmp/test.log';

test('appends an audit line', () => {
  fs.writeFileSync(LOG_PATH, '');
  writeAuditLine(LOG_PATH, 'user.login');
  assert.match(fs.readFileSync(LOG_PATH, 'utf8'), /user\.login/);
});
