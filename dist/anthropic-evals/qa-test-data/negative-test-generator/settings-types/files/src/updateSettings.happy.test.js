'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { updateSettings } = require('./updateSettings');

const CURRENT = { theme: 'light', notificationsEnabled: true, itemsPerPage: 25, tags: [] };

test('applies a partial update', () => {
  const result = updateSettings(CURRENT, { theme: 'dark' });
  assert.equal(result.ok, true);
  assert.equal(result.settings.theme, 'dark');
  assert.equal(result.settings.itemsPerPage, 25);
});
