'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { navItemLabel } = require('../src/nav');

test('label whitespace is collapsed', () => {
  assert.equal(navItemLabel({ label: '  My   Account ' }), 'My Account');
});

test('label without whitespace is unchanged', () => {
  assert.equal(navItemLabel({ label: 'Orders' }), 'Orders');
});
