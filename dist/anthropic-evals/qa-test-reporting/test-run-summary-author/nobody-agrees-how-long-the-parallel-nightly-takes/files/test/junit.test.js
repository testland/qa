'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { parseJUnit } = require('../lib/junit.js');

const SAMPLE = [
  '<testsuites>',
  '  <testsuite name="demo" tests="3" failures="1" skipped="1" time="1.50" timestamp="2026-01-01T00:00:00">',
  '    <testcase classname="demo" name="a" time="0.50"/>',
  '    <testcase classname="demo" name="b" time="1.00"><failure message="boom">trace</failure></testcase>',
  '    <testcase classname="demo" name="c" time="0"><skipped message="later"/></testcase>',
  '  </testsuite>',
  '</testsuites>',
].join('\n');

test('parses one suite with its attributes', () => {
  const suites = parseJUnit(SAMPLE);
  assert.equal(suites.length, 1);
  assert.equal(suites[0].name, 'demo');
  assert.equal(suites[0].timestamp, '2026-01-01T00:00:00');
});

test('assigns a status to every case', () => {
  const [suite] = parseJUnit(SAMPLE);
  assert.deepEqual(
    suite.cases.map((c) => c.status),
    ['passed', 'failed', 'skipped']
  );
  assert.equal(suite.cases[1].message, 'boom');
});
