# Finance asked why a two-minute test suite needs four more runners

## Problem Description

The dashboard adds up the per-test durations and reports that the nightly suite
takes just under two minutes. The CI job's test step takes about ten and a half
minutes, every night, and we are asking for more runners to bring it down.

Somebody in the budget review put those two numbers next to each other and the
request stalled. We need to account for the difference before we ask again, and
we need to be able to say which part of the run the optimisation work would
actually target.

The per-test numbers are also thin. Several tests report a duration of zero,
which is not credible for browser tests that click through a page, and at least
one reports nothing at all. We do not want those quoted as measurements or
averaged into anything.

## Output Specification

1. `scripts/duration-report.js` - reads `reports/nightly.xml` and writes
   `durations.json`: per suite, the duration the suite itself reports, the
   duration accounted for by its tests, the difference and the share accounted
   for; plus a list of tests whose duration is not a measurement.
2. `test/duration-report.test.js` - tests for the accounting, running under
   `npm test` next to the test already in the repo. `npm test` must pass when
   you are done.
3. `durations.md` - where the missing minutes are, which suite they are in,
   what kind of work sits in that gap, and what the optimisation effort should
   target as a result.

Do not edit anything under `reports/`, and do not change `lib/xml.js` or
`test/xml.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ci-reports",
  "private": true,
  "scripts": { "test": "node --test" }
}

=============== FILE: lib/xml.js ===============
'use strict';

const TAG = /<(\/)?([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/)?>/g;
const ATTR = /([\w:.-]+)="([^"]*)"/g;

function parseXml(text) {
  const doc = { tag: '#doc', attrs: {}, children: [] };
  const stack = [doc];
  for (const m of text.matchAll(TAG)) {
    const [, closing, tag, rawAttrs, selfClosing] = m;
    if (closing) {
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of rawAttrs.matchAll(ATTR)) attrs[a[1]] = a[2];
    const node = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return doc.children;
}

module.exports = { parseXml };

=============== FILE: test/xml.test.js ===============
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

=============== FILE: reports/nightly.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="nightly" tests="13" failures="0" errors="0" time="613.33">
  <testsuite name="e2e" tests="9" failures="0" errors="0" skipped="0" time="612.4" timestamp="2026-08-11T01:02:00" hostname="runner-04">
    <testcase classname="e2e.checkout" name="completes a guest order" time="44.2"/>
    <testcase classname="e2e.checkout" name="completes a signed-in order" time="31.5"/>
    <testcase classname="e2e.search" name="filters by brand" time="22.0"/>
    <testcase classname="e2e.search" name="paginates results" time="13.6"/>
    <testcase classname="e2e.account" name="updates the address" time="7.4"/>
    <testcase classname="e2e.account" name="changes the password" time="0"/>
    <testcase classname="e2e.account" name="signs out" time="0"/>
    <testcase classname="e2e.admin" name="loads the dashboard" time="0"/>
    <testcase classname="e2e.admin" name="exports a csv"/>
  </testsuite>
  <testsuite name="unit" tests="4" failures="0" errors="0" skipped="0" time="0.93" timestamp="2026-08-11T01:12:41" hostname="runner-04">
    <testcase classname="unit.money" name="adds two amounts" time="0.41"/>
    <testcase classname="unit.money" name="formats an amount" time="0.30"/>
    <testcase classname="unit.tax" name="rounds half up" time="0.12"/>
    <testcase classname="unit.tax" name="applies the reduced rate" time="0.10"/>
  </testsuite>
</testsuites>
