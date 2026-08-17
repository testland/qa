# On-call gets paged for eight failures that are not eight failures

## Problem Description

Our nightly Maven job posts one line to the on-call channel: "8 failing tests".
Whoever is on call opens the run, reads three stack traces, works out that most
of them are the shared staging database refusing connections, and closes the
page. Four nights running now.

The eight are not the same kind of thing. Some are assertions that came back
false, which is product behaviour somebody has to look at. The rest never
reached an assertion at all - something threw first, mostly connection and
timeout problems against staging.

Routing them by test name does not work. We have a test with `dbRoundTrip` in
the name that fails on a plain assertion, and a test called `assertsTotal` that
dies on a null pointer. Whatever decides where a result goes has to come from
the report itself, not from what the test is called.

We want the nightly digest split so the application team gets the results it can
act on and the platform team gets the staging problems.

## Output Specification

1. `scripts/triage.js` - reads every file in `reports/`, writes `triage.json`
   containing overall counts, per-suite counts, and a per-test list with the
   suite, the test identifier, the outcome, and the message.
2. `test/triage.test.js` - tests for the counting logic, running under
   `npm test` next to the test already in the repo. `npm test` must pass when
   you are done.
3. `triage-notes.md` - the split for the run below: which tests go to which
   team, and the rule that decides it, written so the next person on call can
   apply it without opening the XML.

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
  <testsuite name="com.acme.checkout.CheckoutTest" tests="5" failures="2" errors="1" skipped="0" time="18.442" timestamp="2026-08-11T02:10:04">
    <testcase classname="com.acme.checkout.CheckoutTest" name="appliesPromoCode" time="0.412"/>
    <testcase classname="com.acme.checkout.CheckoutTest" name="rejectsExpiredPromo" time="0.388"/>
    <testcase classname="com.acme.checkout.CheckoutTest" name="totalsIncludeTax" time="0.501">
      <failure message="expected 1210 but was 1200" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.checkout.CheckoutTest" name="dbRoundTrip_persistsOrder" time="1.204">
      <failure message="expected order status SETTLED but was PENDING" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.checkout.CheckoutTest" name="loadsCatalogue" time="15.937">
      <error message="Connection refused: db01-staging:3306" type="java.sql.SQLNonTransientConnectionException"/>
    </testcase>
  </testsuite>
  <testsuite name="com.acme.billing.InvoiceTest" tests="5" failures="1" errors="2" skipped="0" time="30.118" timestamp="2026-08-11T02:10:23">
    <testcase classname="com.acme.billing.InvoiceTest" name="rendersLineItems" time="0.221"/>
    <testcase classname="com.acme.billing.InvoiceTest" name="roundsVatHalfUp" time="0.198"/>
    <testcase classname="com.acme.billing.InvoiceTest" name="assertsTotal" time="0.302">
      <error message="Cannot invoke String.length() because rate is null" type="java.lang.NullPointerException"/>
    </testcase>
    <testcase classname="com.acme.billing.InvoiceTest" name="emailsTheInvoice" time="0.640">
      <failure message="expected 1 message in the outbox but was 0" type="java.lang.AssertionError"/>
    </testcase>
    <testcase classname="com.acme.billing.InvoiceTest" name="archivesPaidInvoices" time="28.757">
      <error message="Timeout waiting for a connection from pool after 30000ms" type="java.sql.SQLTransientConnectionException"/>
    </testcase>
  </testsuite>
  <testsuite name="com.acme.search.IndexTest" tests="4" failures="1" errors="1" skipped="0" time="22.906" timestamp="2026-08-11T02:10:54">
    <testcase classname="com.acme.search.IndexTest" name="indexesNewProducts" time="0.804"/>
    <testcase classname="com.acme.search.IndexTest" name="ranksExactMatchFirst" time="0.611"/>
    <testcase classname="com.acme.search.IndexTest" name="reindexesOnSchemaChange" time="21.100">
      <error message="Read timed out" type="java.net.SocketTimeoutException"/>
    </testcase>
    <testcase classname="com.acme.search.IndexTest" name="highlightsMatchedTerms" time="0.391">
      <failure message="expected the matched term to be wrapped but it was not" type="java.lang.AssertionError"/>
    </testcase>
  </testsuite>
</testsuites>
