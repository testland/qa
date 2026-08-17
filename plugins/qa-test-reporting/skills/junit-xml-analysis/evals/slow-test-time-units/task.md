# Slowest-test board is all backend tests and the backend team says it is wrong

## Problem Description

We publish a "slowest tests this week" list to decide where the optimisation
time goes. Every slot is taken by tests from the order service. The backend team
insists none of their tests take more than about two and a half seconds, and
when they run the suite locally that is what they see.

The browser tests, which anyone who has watched a run knows are the slow ones,
sit below the fold. The checkout journey alone takes over twelve seconds and it
is ranked fourth.

The two suites are written by different teams with different runners and the
reports do not look alike - one of them is not even wrapped the same way as the
other, and an earlier version of our script only found half the tests until
somebody noticed.

There are also a couple of entries with a duration of zero. They are not
instantaneous, they are fast enough that the runner did not record anything
useful, and we do not want them quoted anywhere as performance numbers.

## Output Specification

1. `scripts/slowest.js` - reads every file in `reports/` and writes
   `slowest.json` with a single ranked list of tests by duration in one stated
   unit, the total measured time per report, and a separate list of any test
   whose duration cannot be trusted.
2. `test/slowest.test.js` - tests for the ranking, running under `npm test`
   next to the test already in the repo. `npm test` must pass when you are
   done.
3. `slow-tests.md` - the corrected top three, why the previous list was ordered
   the way it was, and the check that catches this on a report we have not seen
   before.

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

=============== FILE: reports/web-e2e.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="web-e2e" tests="5" failures="0" errors="0" time="18.500">
  <testsuite name="storefront" tests="5" failures="0" errors="0" skipped="0" time="18.500" timestamp="2026-08-11T03:12:40">
    <testcase classname="checkout.spec.ts" name="checkout flow" time="12.480"/>
    <testcase classname="search.spec.ts" name="search page loads" time="3.210"/>
    <testcase classname="auth.spec.ts" name="login" time="1.870"/>
    <testcase classname="shell.spec.ts" name="nav renders" time="0.940"/>
    <testcase classname="shell.spec.ts" name="formats currency" time="0.000"/>
  </testsuite>
</testsuites>

=============== FILE: reports/order-service.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="com.acme.order.OrderServiceTest" tests="5" failures="0" errors="0" skipped="0" time="4.231" timestamp="2026-08-11T03:14:02" hostname="build-07">
  <testcase classname="com.acme.order.OrderServiceTest" name="reservesStock" time="2400"/>
  <testcase classname="com.acme.order.OrderServiceTest" name="appliesDiscount" time="1200"/>
  <testcase classname="com.acme.order.OrderServiceTest" name="validatesAddress" time="620"/>
  <testcase classname="com.acme.order.OrderServiceTest" name="mapsToDto" time="11"/>
  <testcase classname="com.acme.order.OrderServiceTest" name="formatsTotal" time="0"/>
</testsuite>
