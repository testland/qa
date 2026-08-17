# Quarantine list keeps muting tests that fail every single time

## Problem Description

The nightly Java job retries a failing test twice before giving up. We publish a
flake percentage from that report and feed anything it marks into a quarantine
list, which mutes the test and files a ticket.

Two complaints have come in. First, tests that fail on all three attempts are
landing on the quarantine list and getting muted, so genuine breakage stops
blocking anything - that is how last week's tax rounding bug reached staging.
Second, engineers say a run came back green and the suite still "felt" unstable;
the tests that needed a second attempt to pass never appear anywhere in the PR
summary, because by the end of the run they are green.

We want a number we can defend in front of the platform review, with the tests
behind it named, and a quarantine list that only contains things worth muting.

## Output Specification

1. `scripts/flake-report.js` - reads `reports/surefire-merged.xml` and writes
   `flake-report.json` carrying, for every test that did not pass first time,
   which category it belongs to and what happened on the attempts; plus the
   headline counts and the rate, with the denominator recorded next to it.
2. `test/flake-report.test.js` - tests for the categorisation, running under
   `npm test` next to the test already in the repo. `npm test` must pass when
   you are done.
3. `flake-report.md` - the categories with their counts for this run, which
   tests belong in the quarantine list and which must not, and the rate with
   its definition.

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

=============== FILE: reports/surefire-merged.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="com.acme.OrderTest" tests="10" failures="1" errors="1" skipped="1" time="66.204">
    <testcase classname="com.acme.OrderTest" name="createsAnOrder" time="0.410"/>
    <testcase classname="com.acme.OrderTest" name="rejectsEmptyCart" time="0.221"/>
    <testcase classname="com.acme.OrderTest" name="appliesLoyaltyPoints" time="0.317"/>
    <testcase classname="com.acme.OrderTest" name="splitsShipments" time="0.502"/>
    <testcase classname="com.acme.OrderTest" name="cancelsWithinWindow" time="0.288"/>
    <testcase classname="com.acme.OrderTest" name="reservesStock" time="4.910">
      <flakyFailure message="expected 2 reservations but was 1" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.OrderTest" name="notifiesWarehouse" time="6.140">
      <flakyFailure message="expected 1 webhook but was 0" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.OrderTest" name="recalculatesTax" time="12.330">
      <rerunFailure message="expected 1210 but was 1200" type="java.lang.AssertionError"/>
      <rerunFailure message="expected 1210 but was 1200" type="java.lang.AssertionError"/>
      <failure message="expected 1210 but was 1200" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.OrderTest" name="exportsToLedger" time="0.904">
      <error message="Cannot invoke Ledger.append() because client is null" type="java.lang.NullPointerException"/>
    </testcase>
    <testcase classname="com.acme.OrderTest" name="honoursLegacyPricing" time="0">
      <skipped message="legacy pricing removed 2026-02"/>
    </testcase>
  </testsuite>
  <testsuite name="com.acme.PaymentTest" tests="8" failures="1" errors="1" skipped="0" time="41.880">
    <testcase classname="com.acme.PaymentTest" name="authorisesCard" time="0.502"/>
    <testcase classname="com.acme.PaymentTest" name="capturesAuthorisedAmount" time="0.611"/>
    <testcase classname="com.acme.PaymentTest" name="refundsInFull" time="0.588"/>
    <testcase classname="com.acme.PaymentTest" name="declinesInsufficientFunds" time="0.470"/>
    <testcase classname="com.acme.PaymentTest" name="retriesOn3dsChallenge" time="7.220">
      <flakyError message="Read timed out" type="java.net.SocketTimeoutException"/>
    </testcase>
    <testcase classname="com.acme.PaymentTest" name="settlesNightly" time="9.104">
      <flakyFailure message="expected settlement batch 1 but was 0" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.PaymentTest" name="reconcilesLedger" time="21.440">
      <rerunError message="Connection refused: pay-sandbox:8443" type="java.net.ConnectException"/>
      <error message="Connection refused: pay-sandbox:8443" type="java.net.ConnectException"/>
    </testcase>
    <testcase classname="com.acme.PaymentTest" name="formatsReceipt" time="1.945">
      <failure message="expected currency EUR but was USD" type="java.lang.AssertionError"/>
    </testcase>
  </testsuite>
</testsuites>
