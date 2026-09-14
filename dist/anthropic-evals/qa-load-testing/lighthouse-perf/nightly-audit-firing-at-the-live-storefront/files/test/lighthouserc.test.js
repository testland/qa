'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../.lighthouserc.js');

test('config exposes a ci block with a collect section', () => {
  assert.ok(config.ci, 'ci block missing');
  assert.ok(config.ci.collect, 'ci.collect missing');
});

test('every collected url parses', () => {
  const urls = config.ci.collect.url;
  assert.ok(Array.isArray(urls) && urls.length > 0, 'collect.url must be a non-empty array');
  for (const u of urls) assert.doesNotThrow(() => new URL(u), `unparseable url: ${u}`);
});
