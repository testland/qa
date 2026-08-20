'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseXml } = require('../lib/xml');

test('reads attributes and nesting', () => {
  const [suite] = parseXml('<testsuite name="a" tests="1"><testcase name="t" time="0.5"/></testsuite>');
  assert.equal(suite.attrs.name, 'a');
  assert.equal(suite.children.length, 1);
  assert.equal(suite.children[0].attrs.time, '0.5');
});
