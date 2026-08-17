# Merged shard totals report more tests than the repo contains

## Problem Description

The end-to-end suite runs across four machines and each machine uploads its own
XML report. A small script adds the reports together and posts the total to the
PR.

Last night machine 3 was killed part-way through by the cloud provider. CI
re-queued that shard and it finished clean, so the artifact directory now has
both the aborted attempt and the re-run. The PR comment said "16 tests" and
"2 errors". We have 12 end-to-end tests in the repo and the run was green.

We also do not trust the merge for a second reason: two different spec files
each have a test called `adds an item`, and an earlier version of the script
reported 11 tests, which nobody could explain at the time.

## Output Specification

1. `scripts/merge-shards.js` - reads every file in `reports/`, writes
   `merged-summary.json` with the real totals (tests, passed, failed, errored,
   skipped) plus a list of any test that has more than one recorded attempt,
   showing what happened on each attempt.
2. `test/merge-shards.test.js` - tests for the merge, running under `npm test`
   next to the test already in the repo. `npm test` must pass when you are
   done.
3. `merge-notes.md` - what the old total was counting, what identifies one test
   across shards, and how a re-run of a shard is meant to combine with the
   attempt it replaces.

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

=============== FILE: reports/shard-1.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="shard-1" tests="4" failures="0" errors="0" skipped="0" time="31.204" timestamp="2026-08-11T02:04:11">
  <testcase classname="tests/cart.spec.ts" name="adds an item" time="6.204"/>
  <testcase classname="tests/cart.spec.ts" name="removes an item" time="5.880"/>
  <testcase classname="tests/cart.spec.ts" name="updates the quantity" time="7.010"/>
  <testcase classname="tests/login.spec.ts" name="rejects a bad password" time="12.110"/>
</testsuite>

=============== FILE: reports/shard-2.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="shard-2" tests="4" failures="0" errors="0" skipped="0" time="28.740" timestamp="2026-08-11T02:04:09">
  <testcase classname="tests/wishlist.spec.ts" name="adds an item" time="6.440"/>
  <testcase classname="tests/wishlist.spec.ts" name="moves to the cart" time="7.120"/>
  <testcase classname="tests/search.spec.ts" name="filters by brand" time="8.900"/>
  <testcase classname="tests/search.spec.ts" name="paginates" time="6.280"/>
</testsuite>

=============== FILE: reports/shard-3.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="shard-3" tests="4" failures="0" errors="2" skipped="0" time="19.880" timestamp="2026-08-11T02:14:07">
  <testcase classname="tests/checkout.spec.ts" name="applies a promo code" time="9.410"/>
  <testcase classname="tests/checkout.spec.ts" name="charges the card" time="4.220">
    <error message="worker process exited unexpectedly" type="WorkerError"/>
  </testcase>
  <testcase classname="tests/checkout.spec.ts" name="emails a receipt" time="0.010">
    <error message="worker process exited unexpectedly" type="WorkerError"/>
  </testcase>
  <testcase classname="tests/account.spec.ts" name="updates the address" time="6.240"/>
</testsuite>

=============== FILE: reports/shard-3-rerun.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="shard-3" tests="4" failures="0" errors="0" skipped="0" time="34.190" timestamp="2026-08-11T02:41:52">
  <testcase classname="tests/checkout.spec.ts" name="applies a promo code" time="9.220"/>
  <testcase classname="tests/checkout.spec.ts" name="charges the card" time="11.440"/>
  <testcase classname="tests/checkout.spec.ts" name="emails a receipt" time="7.290"/>
  <testcase classname="tests/account.spec.ts" name="updates the address" time="6.240"/>
</testsuite>
