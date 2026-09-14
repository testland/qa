'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildCapabilities, GRID_URL } = require('../src/capabilities');

test('buildCapabilities returns a capabilities object', () => {
  const caps = buildCapabilities();
  assert.ok(caps);
  assert.strictEqual(typeof caps.browserName, 'string');
});

test('buildCapabilities lets a caller name the session', () => {
  const caps = buildCapabilities({ name: 'checkout' });
  assert.strictEqual(caps['se:name'], 'checkout');
});

test('grid url falls back to the local hub', () => {
  assert.match(GRID_URL, /^https?:\/\//);
});
