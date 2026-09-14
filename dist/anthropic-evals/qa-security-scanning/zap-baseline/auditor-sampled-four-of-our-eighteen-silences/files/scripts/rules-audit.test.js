'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { audit } = require('./rules-audit');

test('a well-formed entry with a trailing comment is accepted', () => {
  assert.deepEqual(audit('10049\tIGNORE\t*\t# legacy cookie, ops-2231'), []);
});

test('comment-only and blank lines are skipped', () => {
  assert.deepEqual(audit('# a note\n\n  \n'), []);
});

test('a space-separated entry is reported', () => {
  const problems = audit('10038 IGNORE *');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /tab-separated/);
});

test('an action the scanner does not understand is reported', () => {
  const problems = audit('10202\tSKIP\t*');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /unknown action/);
});
