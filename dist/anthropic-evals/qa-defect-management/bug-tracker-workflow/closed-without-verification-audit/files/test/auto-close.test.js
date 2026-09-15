'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { decide } = require('../automation/auto-close');

test('a ticket with no merged fix is left alone', () => {
  const d = decide({ key: 'ENG-1', state: 'Fixed', pr_merged: false, deploy_status: 'succeeded' });
  assert.strictEqual(d.action, 'none');
});

test('a ticket that is already closed is not touched again', () => {
  const d = decide({ key: 'ENG-2', state: 'Closed', pr_merged: true, deploy_status: 'succeeded' });
  assert.strictEqual(d.action, 'none');
});
