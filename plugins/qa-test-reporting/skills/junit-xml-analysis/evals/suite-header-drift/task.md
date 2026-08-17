# Release gate reported a clean run on a night something threw

## Problem Description

Our release gate and the metrics job both read the summary numbers on each
suite element and never look further down the file. Last Friday the gate
recorded zero errors for a build where the console log clearly shows an
exception thrown out of a checkout test, and the metrics job recorded 21 tests
for a run where the runner printed 23.

Two tests that did not run at all are also missing from the metrics. Nobody
noticed until a release went out with that area untested.

We are not going to get the runner fixed - it is a vendor tool and the summary
numbers on the suite elements are what they are. We want our own numbers to come
from something we can defend, and we want to know for each suite whether its
summary line can be trusted, because we suspect it varies by suite.

## Output Specification

1. `scripts/verify-report.js` - reads `reports/build-1487.xml` and writes
   `verified-counts.json`: per suite, the numbers declared on the suite element
   next to the numbers you derive, with any disagreement marked; plus the
   overall totals your job should publish.
2. `test/verify-report.test.js` - tests for the recount, running under
   `npm test` next to the test already in the repo. `npm test` must pass when
   you are done.
3. `verified-counts.md` - the real totals for this build, each place the suite
   summary disagrees with the rest of the file and in which direction, and
   which suite's summary was accurate.

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

=============== FILE: reports/build-1487.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="build-1487">
  <testsuite name="web.CheckoutSpec" tests="12" failures="2" errors="0" skipped="0" time="24.118" timestamp="2026-08-08T18:04:12">
    <testcase classname="web.CheckoutSpec" name="adds an item" time="1.204"/>
    <testcase classname="web.CheckoutSpec" name="removes an item" time="1.180"/>
    <testcase classname="web.CheckoutSpec" name="updates the quantity" time="1.311"/>
    <testcase classname="web.CheckoutSpec" name="applies a promo code" time="1.402"/>
    <testcase classname="web.CheckoutSpec" name="rejects an expired promo" time="1.190"/>
    <testcase classname="web.CheckoutSpec" name="submits the order" time="4.020">
      <failure message="expected the confirmation panel to be visible" type="AssertionError"/>
    </testcase>
    <testcase classname="web.CheckoutSpec" name="shows the confirmation" time="2.104"/>
    <testcase classname="web.CheckoutSpec" name="keeps the cart on failure" time="1.078"/>
    <testcase classname="web.CheckoutSpec" name="charges the card" time="8.440">
      <error message="Connection refused: pay-sandbox:8443" type="java.net.ConnectException"/>
    </testcase>
    <testcase classname="web.CheckoutSpec" name="emails a receipt" time="0.0">
      <skipped message="mail sandbox unavailable"/>
    </testcase>
    <testcase classname="web.CheckoutSpec" name="prints an invoice" time="0.0">
      <skipped message="disabled pending the redesign"/>
    </testcase>
    <testcase classname="web.CheckoutSpec" name="renders an empty cart" time="1.189"/>
  </testsuite>
  <testsuite name="api.OrdersSpec" tests="5" failures="0" errors="0" skipped="2" time="6.402" timestamp="2026-08-08T18:04:41">
    <testcase classname="api.OrdersSpec" name="creates an order" time="1.902"/>
    <testcase classname="api.OrdersSpec" name="lists orders" time="0.884"/>
    <testcase classname="api.OrdersSpec" name="cancels an order" time="1.117"/>
    <testcase classname="api.OrdersSpec" name="refunds an order" time="1.240"/>
    <testcase classname="api.OrdersSpec" name="splits a shipment" time="1.259"/>
    <testcase classname="api.OrdersSpec" name="reserves stock" time="0.0">
      <skipped message="warehouse stub not deployed"/>
    </testcase>
    <testcase classname="api.OrdersSpec" name="notifies the warehouse" time="0.0">
      <skipped message="warehouse stub not deployed"/>
    </testcase>
  </testsuite>
  <testsuite name="api.RefundsSpec" tests="4" failures="0" errors="0" skipped="0" time="3.110" timestamp="2026-08-08T18:04:52">
    <testcase classname="api.RefundsSpec" name="issues a refund" time="0.902"/>
    <testcase classname="api.RefundsSpec" name="voids a refund" time="0.744"/>
    <testcase classname="api.RefundsSpec" name="rejects a double refund" time="0.810"/>
    <testcase classname="api.RefundsSpec" name="records the reason" time="0.654"/>
  </testsuite>
</testsuites>
