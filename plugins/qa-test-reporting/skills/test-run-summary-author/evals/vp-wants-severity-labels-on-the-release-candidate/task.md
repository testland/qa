# The VP wants the four failures graded Critical / Major / Minor before Thursday's release call

## Problem Description

We cut the v4.1.0 release candidate on Monday night and the CI job that ran
against it is the only evidence anybody has. Thursday 09:00 there is a release
call with our VP of Engineering, and she sent me three bullets she wants
answered on one slide:

- "What is the pass rate on the RC?"
- "Grade the failures Critical / Major / Minor so I can see what is actually
  blocking the ship and what we can live with."
- "Give me the three worst ones, one line each on why they matter."

Two things make me nervous about walking in with this.

First, the Slack bot has been posting "40 of 44 passed - 90.9% green" every
night since May and she has started quoting that figure back at us in other
meetings. A chunk of that suite has not actually run in weeks: there are specs
sitting behind feature flags that are off in CI, and three payment specs that
need a sandbox we have never had on the build agents. I would like the number
we bring to the call to be one I can defend line by line rather than one that
happens to match what the bot said.

Second, she is going to ask "where did that come from?" about every figure on
the slide, and last quarter somebody in my position could not answer that and
it went badly. There is no earlier run to lean on either - this RC branch was
cut fresh and the artifacts from the previous release cycle have already aged
out of the CI retention window, so the attached XML is genuinely all I have.

The run is attached, along with the small parsing helper our tooling repo
already uses.

## Output Specification

1. `scripts/qa-summary.js` - reads `reports/junit-v4.1.0.xml` and writes
   `qa-summary.json` containing every figure the slide quotes, so the two can
   be checked against each other.
2. `test/qa-summary.test.js` - tests for whatever `scripts/qa-summary.js`
   computes, running under `npm test` next to the test already in the repo.
   `npm test` must pass when you are done.
3. `docs/qa-status-v4.1.0.md` - what I take into the call, in her three-bullet
   order, short enough to read off a phone, plus whatever I need in order to
   answer "where did that come from?" for each number in it.

Do not edit anything under `reports/`, and do not change `lib/junit.js` or
`test/junit.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "acme-release-reporting",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/junit.js ===============
'use strict';

const TAG = /<(\/)?([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/)?>/g;
const ATTR = /([\w:.-]+)="([^"]*)"/g;

function attrs(raw) {
  const out = {};
  for (const m of (raw || '').matchAll(ATTR)) out[m[1]] = m[2];
  return out;
}

const OUTCOME = { failure: 'failed', error: 'failed', skipped: 'skipped' };

function parseJUnit(xml) {
  const suites = [];
  let suite = null;
  let tc = null;
  for (const m of xml.matchAll(TAG)) {
    const [, closing, tag, raw, selfClosing] = m;
    if (tag === 'testsuite') {
      if (closing) suite = null;
      else {
        suite = Object.assign(attrs(raw), { cases: [] });
        suites.push(suite);
      }
    } else if (tag === 'testcase') {
      if (closing) tc = null;
      else {
        tc = Object.assign(attrs(raw), { status: 'passed', message: '' });
        if (suite) suite.cases.push(tc);
        if (selfClosing) tc = null;
      }
    } else if (!closing && tc && OUTCOME[tag]) {
      tc.status = OUTCOME[tag];
      tc.message = attrs(raw).message || '';
    }
  }
  return suites;
}

module.exports = { parseJUnit };

=============== FILE: test/junit.test.js ===============
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
  assert.equal(suites[0].tests, '3');
});

test('assigns a status to every case', () => {
  const [suite] = parseJUnit(SAMPLE);
  assert.deepEqual(
    suite.cases.map((c) => c.status),
    ['passed', 'failed', 'skipped']
  );
  assert.equal(suite.cases[1].message, 'boom');
});

=============== FILE: reports/junit-v4.1.0.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="acme-web v4.1.0-rc.1" tests="44" failures="4" errors="0" skipped="7" time="71.04">
  <testsuite name="checkout" tests="12" failures="2" errors="0" skipped="1" time="19.23" timestamp="2026-09-08T22:04:11">
    <testcase classname="checkout" name="adds item to cart" time="0.42"/>
    <testcase classname="checkout" name="removes item from cart" time="0.38"/>
    <testcase classname="checkout" name="updates quantity" time="0.51"/>
    <testcase classname="checkout" name="applies promo code to subtotal" time="1.94">
      <failure message="expected subtotal 41.30, received 41.31">AssertionError at checkout.spec.ts:88</failure>
    </testcase>
    <testcase classname="checkout" name="rejects expired promo code" time="0.44"/>
    <testcase classname="checkout" name="blocks checkout when cart is empty" time="12.06">
      <failure message="Timeout 12000ms exceeded waiting for [data-testid=empty-cart-notice]">TimeoutError at checkout.spec.ts:131</failure>
    </testcase>
    <testcase classname="checkout" name="calculates tax for EU address" time="0.63"/>
    <testcase classname="checkout" name="calculates tax for US address" time="0.59"/>
    <testcase classname="checkout" name="persists cart across reload" time="0.88"/>
    <testcase classname="checkout" name="shows shipping options" time="0.72"/>
    <testcase classname="checkout" name="applies free shipping over threshold" time="0.66"/>
    <testcase classname="checkout" name="offers gift wrap at checkout" time="0">
      <skipped message="feature flag gift_wrap is off in ci"/>
    </testcase>
  </testsuite>
  <testsuite name="auth" tests="9" failures="1" errors="0" skipped="0" time="36.32" timestamp="2026-09-08T22:04:31">
    <testcase classname="auth" name="logs in with password" time="0.71"/>
    <testcase classname="auth" name="rejects wrong password" time="0.45"/>
    <testcase classname="auth" name="refreshes token before expiry" time="30.11">
      <failure message="Timeout 30000ms exceeded waiting for token refresh response">TimeoutError at auth.spec.ts:64</failure>
    </testcase>
    <testcase classname="auth" name="logs out" time="0.33"/>
    <testcase classname="auth" name="resets password by email" time="1.22"/>
    <testcase classname="auth" name="locks account after five attempts" time="0.94"/>
    <testcase classname="auth" name="sso redirects to idp" time="1.05"/>
    <testcase classname="auth" name="sso handles idp error" time="0.87"/>
    <testcase classname="auth" name="remembers device" time="0.64"/>
  </testsuite>
  <testsuite name="payments" tests="11" failures="1" errors="0" skipped="3" time="9.40" timestamp="2026-09-08T22:05:08">
    <testcase classname="payments" name="charges card" time="0.98"/>
    <testcase classname="payments" name="declines invalid card" time="0.55"/>
    <testcase classname="payments" name="issues full refund" time="1.31"/>
    <testcase classname="payments" name="issues partial refund for cancelled line item" time="2.47">
      <failure message="expected refund state 'refunded', received 'pending'">AssertionError at payments.spec.ts:212</failure>
    </testcase>
    <testcase classname="payments" name="retries on gateway timeout" time="1.88"/>
    <testcase classname="payments" name="records idempotency key" time="0.77"/>
    <testcase classname="payments" name="completes 3ds challenge flow" time="0">
      <skipped message="gateway sandbox not available on build agents"/>
    </testcase>
    <testcase classname="payments" name="pays with apple pay" time="0">
      <skipped message="gateway sandbox not available on build agents"/>
    </testcase>
    <testcase classname="payments" name="pays with google pay" time="0">
      <skipped message="gateway sandbox not available on build agents"/>
    </testcase>
    <testcase classname="payments" name="stores payment method" time="0.83"/>
    <testcase classname="payments" name="deletes payment method" time="0.61"/>
  </testsuite>
  <testsuite name="search" tests="7" failures="0" errors="0" skipped="2" time="2.44" timestamp="2026-09-08T22:05:18">
    <testcase classname="search" name="returns results for keyword" time="0.52"/>
    <testcase classname="search" name="paginates results" time="0.48"/>
    <testcase classname="search" name="filters by category" time="0.61"/>
    <testcase classname="search" name="sorts by price" time="0.44"/>
    <testcase classname="search" name="handles empty results" time="0.39"/>
    <testcase classname="search" name="shows typeahead suggestions" time="0">
      <skipped message="feature flag typeahead_v2 is off in ci"/>
    </testcase>
    <testcase classname="search" name="expands synonyms" time="0">
      <skipped message="feature flag typeahead_v2 is off in ci"/>
    </testcase>
  </testsuite>
  <testsuite name="notifications" tests="5" failures="0" errors="0" skipped="1" time="3.65" timestamp="2026-09-08T22:05:21">
    <testcase classname="notifications" name="sends order confirmation email" time="1.14"/>
    <testcase classname="notifications" name="sends shipping email" time="0.92"/>
    <testcase classname="notifications" name="sends refund email" time="0.88"/>
    <testcase classname="notifications" name="respects unsubscribe" time="0.71"/>
    <testcase classname="notifications" name="delivers push notification" time="0">
      <skipped message="no mobile device attached to build agent"/>
    </testcase>
  </testsuite>
</testsuites>
