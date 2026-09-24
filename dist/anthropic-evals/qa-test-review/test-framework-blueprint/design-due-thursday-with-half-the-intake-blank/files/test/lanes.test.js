'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLane, isDomestic } = require('../src/lanes');

test('parses an origin-destination lane code', () => {
  assert.deepEqual(parseLane('LHR-MAN'), { origin: 'LHR', destination: 'MAN' });
});

test('rejects a malformed lane code', () => {
  assert.throws(() => parseLane('LHR/MAN'), /bad lane code/);
});

test('a lane between two home airports is domestic', () => {
  assert.equal(isDomestic('LHR-MAN', ['LHR', 'MAN', 'EDI']), true);
});
