# Release channel gets one line per build and the line has been wrong twice

## Problem Description

Four teams publish reports into the same artifact directory and a small
aggregator posts one line to the release channel: how many tests ran and whether
the build is clean.

Two problems. The line said "5 tests" on a build where the four teams between
them ran twelve; the Python team's report and the Java team's report contribute
nothing to the total and never have, and both teams have stopped trusting the
channel. The files are not written the same way - the frameworks differ and so
does the shape of what they emit at the top of the file.

Second, last Tuesday the line said the build was clean. The integration stage
had failed to start that night, so its report contains no results at all, and
the aggregator read a report with nothing wrong in it as a report with nothing
wrong.

## Output Specification

1. `scripts/aggregate.js` - reads every file in `reports/` and writes
   `run-summary.json`: one entry per report file with how many results it
   contributed and whether it produced any, plus the overall totals and the
   single verdict line for the channel.
2. `test/aggregate.test.js` - tests for the aggregation, running under
   `npm test` next to the test already in the repo. `npm test` must pass when
   you are done.
3. `aggregate-notes.md` - the corrected totals for this build, why two of the
   reports were contributing nothing, and what the verdict line must say when a
   report arrives with no results in it.

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
<testsuites name="jest tests" tests="3" failures="1" errors="0" time="0.910">
  <testsuite name="CartSummary" tests="3" failures="1" errors="0" skipped="0" time="0.910">
    <testcase classname="CartSummary" name="renders the line items" time="0.412">
      <failure message="expected 3 line items but received 2" type="Error"/>
    </testcase>
    <testcase classname="CartSummary" name="shows the empty state" time="0.308"/>
    <testcase classname="CartSummary" name="formats the total" time="0.190"/>
  </testsuite>
</testsuites>

=============== FILE: reports/pytest.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<testsuite name="pytest" tests="4" failures="0" errors="0" skipped="0" time="3.564" timestamp="2026-08-11T05:20:14" hostname="runner-02">
  <testcase classname="tests.api.test_orders" name="test_create" time="0.902"/>
  <testcase classname="tests.api.test_orders" name="test_list" time="0.410"/>
  <testcase classname="tests.api.test_refunds" name="test_issue" time="1.204"/>
  <testcase classname="tests.api.test_refunds" name="test_void" time="1.048"/>
</testsuite>

=============== FILE: reports/TEST-com.acme.CartTest.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="com.acme.CartTest" tests="3" failures="0" errors="1" skipped="0" time="9.884" timestamp="2026-08-11T05:20:31" hostname="build-07">
  <testcase classname="com.acme.CartTest" name="addsAnItem" time="0.402"/>
  <testcase classname="com.acme.CartTest" name="mergesGuestCart" time="9.104">
    <error message="Connection refused: db01-staging:3306" type="java.sql.SQLNonTransientConnectionException"/>
  </testcase>
  <testcase classname="com.acme.CartTest" name="clearsTheCart" time="0.378"/>
</testsuite>

=============== FILE: reports/playwright.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="playwright" tests="2" failures="0" errors="0" time="9.876">
  <testsuite name="[chromium] checkout.spec.ts" tests="2" failures="0" errors="0" skipped="0" time="9.876">
    <testcase classname="checkout.spec.ts" name="completes an order" time="5.006"/>
    <testcase classname="checkout.spec.ts" name="keeps the cart on failure" time="4.870"/>
  </testsuite>
</testsuites>

=============== FILE: reports/integration.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="integration" tests="0" failures="0" errors="0" skipped="0" time="0.000"/>
