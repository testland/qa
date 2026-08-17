# "renders" is the worst test in the company and nobody can find it

## Problem Description

The weekly failing-test board is built from the reports of three teams. The top
row says `renders` with 4 failures and has said so for a month. Two people have
now gone looking for the test called `renders` and given up - there is no single
test by that name.

The second row is `test_create` with 2 failures, which has the same problem.

Whatever we replace this with has to keep tests from different teams apart. The
three reports do not identify tests the same way: the frontend one uses the
component name, the Python one uses a dotted module path, and the browser one
uses the spec file, which is the same string for every browser the spec runs
against.

We would also like to know whether anything is genuinely failing more than once
in a run, because that is a different problem from four separate tests sharing a
name.

## Output Specification

1. `scripts/group-failures.js` - reads every file in `reports/` and writes
   `failing-tests.json`: one entry per genuinely distinct failing test, with a
   key that survives being merged with the other teams' reports, the number of
   failing executions behind it, and where each execution came from.
2. `test/group-failures.test.js` - tests for the key and the grouping, running
   under `npm test` next to the test already in the repo. `npm test` must pass
   when you are done.
3. `failing-tests.md` - the corrected board, what the old `renders` row was
   actually made of, and the identification rule, including what to do when the
   same test is run more than once in a single build.

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

=============== FILE: reports/jest.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="jest tests" tests="5" failures="2" errors="0" time="1.431">
  <testsuite name="CartSummary" tests="3" failures="1" errors="0" skipped="0" time="0.810">
    <testcase classname="CartSummary" name="renders" time="0.412">
      <failure message="expected 3 line items but received 2" type="Error"/>
    </testcase>
    <testcase classname="CartSummary" name="shows the empty state" time="0.208"/>
    <testcase classname="CartSummary" name="formats the total" time="0.190"/>
  </testsuite>
  <testsuite name="Header" tests="2" failures="1" errors="0" skipped="0" time="0.621">
    <testcase classname="Header" name="renders" time="0.377">
      <failure message="expected the logo to be in the document" type="Error"/>
    </testcase>
    <testcase classname="Header" name="shows the user menu" time="0.244"/>
  </testsuite>
</testsuites>

=============== FILE: reports/pytest.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" tests="4" failures="2" errors="0" skipped="0" time="2.884">
    <testcase classname="tests.api.test_orders" name="test_create" time="0.902">
      <failure message="assert response.status_code == 200" type="AssertionError"/>
    </testcase>
    <testcase classname="tests.api.test_orders" name="test_list" time="0.410"/>
    <testcase classname="tests.api.test_refunds" name="test_create" time="1.204">
      <failure message="assert refund.state == 'issued'" type="AssertionError"/>
    </testcase>
    <testcase classname="tests.api.test_refunds" name="test_void" time="0.368"/>
  </testsuite>
</testsuites>

=============== FILE: reports/playwright.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="playwright" tests="4" failures="2" errors="0" time="14.220">
  <testsuite name="[chromium] checkout.spec.ts" tests="2" failures="1" errors="0" skipped="0" time="7.110">
    <testcase classname="checkout.spec.ts" name="renders" time="2.104">
      <failure message="expected the order summary to be visible" type="AssertionError"/>
    </testcase>
    <testcase classname="checkout.spec.ts" name="completes an order" time="5.006"/>
  </testsuite>
  <testsuite name="[firefox] checkout.spec.ts" tests="2" failures="1" errors="0" skipped="0" time="7.110">
    <testcase classname="checkout.spec.ts" name="renders" time="2.240">
      <failure message="expected the order summary to be visible" type="AssertionError"/>
    </testcase>
    <testcase classname="checkout.spec.ts" name="completes an order" time="4.870"/>
  </testsuite>
</testsuites>
