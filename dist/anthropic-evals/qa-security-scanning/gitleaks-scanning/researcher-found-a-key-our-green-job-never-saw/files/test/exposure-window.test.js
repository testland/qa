'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const w = JSON.parse(fs.readFileSync('security/exposure-window.json', 'utf8'));

test('the window has a parseable start and end', () => {
  assert.ok(!Number.isNaN(Date.parse(w.start)), 'unparseable start');
  assert.ok(!Number.isNaN(Date.parse(w.end)), 'unparseable end');
});

test('the window starts before it ends', () => {
  assert.ok(Date.parse(w.start) < Date.parse(w.end));
});

test('the introducing commit is recorded', () => {
  assert.match(w.introduced_commit, /^[0-9a-f]{7,40}$/);
});
