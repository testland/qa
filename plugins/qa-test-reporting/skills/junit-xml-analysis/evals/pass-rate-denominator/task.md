# The board says 95% green while the mobile team says nothing of theirs runs

## Problem Description

The quality board on the wall shows "95% pass rate" for the backend suite and
has done for months. It is computed as (total tests minus failures) over total
tests.

Two weeks ago the inference team asked why a bug shipped that a test in the
suite covers. The test is in the report. It did not run - the runner marked it
and moved on, and the board counted it as green.

We want a pass rate that reflects tests that actually executed, and a separate
view of what did not execute, because we think the second number is the story.
Skipping is not automatically wrong here - a good share of the suite is gated on
hardware the CI runners do not have, and those tests should not be a build
failure. But some of the entries are switched off for reasons that have nothing
to do with hardware and nobody is tracking them.

## Output Specification

1. `scripts/pass-rate.js` - reads `reports/pytest.xml` and writes
   `pass-rate.json` with the executed count, the pass rate over executed tests,
   and the non-executed tests grouped by the reason recorded against them.
2. `test/pass-rate.test.js` - tests for the rate calculation, running under
   `npm test` next to the test already in the repo. `npm test` must pass when
   you are done.
3. `pass-rate.md` - the corrected numbers for this run, the definition behind
   each one so two people compute the same figure next month, and what you
   recommend the build gate does about the non-executed tests.

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

=============== FILE: reports/pytest.xml ===============
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" tests="20" failures="1" errors="0" skipped="9" time="41.882" timestamp="2026-08-11T04:02:11">
    <testcase classname="tests.checkout.test_cart" name="test_add_item" time="0.412"/>
    <testcase classname="tests.checkout.test_cart" name="test_remove_item" time="0.388"/>
    <testcase classname="tests.checkout.test_cart" name="test_quantity_limits" time="0.501"/>
    <testcase classname="tests.checkout.test_promo" name="test_percentage_discount" time="0.220"/>
    <testcase classname="tests.checkout.test_promo" name="test_expired_code" time="0.244"/>
    <testcase classname="tests.checkout.test_promo" name="test_stacked_codes" time="0.0">
      <skipped type="pytest.skip" message="disabled 2026-03-04, see QA-4421"/>
    </testcase>
    <testcase classname="tests.checkout.test_promo" name="test_case_insensitive_code" time="0.0">
      <skipped type="pytest.skip" message="disabled 2026-03-04, see QA-4421"/>
    </testcase>
    <testcase classname="tests.checkout.test_promo" name="test_free_shipping_code" time="0.0">
      <skipped type="pytest.skip" message="disabled 2026-03-04, see QA-4421"/>
    </testcase>
    <testcase classname="tests.api.test_orders" name="test_create" time="1.902"/>
    <testcase classname="tests.api.test_orders" name="test_list" time="0.884"/>
    <testcase classname="tests.api.test_orders" name="test_cancel" time="1.117">
      <failure message="assert order.state == 'cancelled'" type="AssertionError"/>
    </testcase>
    <testcase classname="tests.api.test_orders" name="test_refund" time="1.240"/>
    <testcase classname="tests.ml.test_preprocess" name="test_normalises_input" time="2.104"/>
    <testcase classname="tests.ml.test_preprocess" name="test_rejects_empty_batch" time="1.880"/>
    <testcase classname="tests.ml.test_inference" name="test_batch_scoring" time="0.0">
      <skipped type="pytest.skip" message="requires a CUDA device"/>
    </testcase>
    <testcase classname="tests.ml.test_inference" name="test_single_scoring" time="0.0">
      <skipped type="pytest.skip" message="requires a CUDA device"/>
    </testcase>
    <testcase classname="tests.ml.test_inference" name="test_scoring_timeout" time="0.0">
      <skipped type="pytest.skip" message="requires a CUDA device"/>
    </testcase>
    <testcase classname="tests.ml.test_inference" name="test_model_versioning" time="0.0">
      <skipped type="pytest.skip" message="requires a CUDA device"/>
    </testcase>
    <testcase classname="tests.ml.test_inference" name="test_fallback_to_cpu" time="0.0">
      <skipped type="pytest.skip" message="requires a CUDA device"/>
    </testcase>
    <testcase classname="tests.ml.test_inference" name="test_warm_start" time="0.0">
      <skipped type="pytest.skip" message="requires a CUDA device"/>
    </testcase>
  </testsuite>
</testsuites>
