# Two dashboards read the same report and disagree about how many tests ran

## Problem Description

The monorepo runner writes one report for the whole build. Our internal board
reads it and says the last run had 6 tests. The vendor dashboard we are
evaluating reads the same file and says 16. The runner's own console output said
11, which is the number we believe.

The 6 is the worse of the two. A failing test in the auth package is not on our
board at all, and it took a customer report to find it. When it did finally
appear on a later run it was attributed to the api package, which sent the
ticket to the wrong team.

The build also had one result that is not an assertion failure - something threw
before the test got that far - and our board rolled it into the failure count,
which is how it ended up with the api team instead of the platform team.

## Output Specification

1. `scripts/flatten.js` - reads `reports/monorepo.xml` and writes
   `suite-metrics.json`: one row per suite that directly owns tests, carrying
   the suite's full path, its own test count, and its own passed / failed /
   errored / skipped counts, plus an overall total.
2. `test/flatten.test.js` - tests for the walk, running under `npm test` next
   to the test already in the repo. `npm test` must pass when you are done.
3. `suite-metrics.md` - the corrected numbers, an explanation of where 6 and 16
   each came from, and which team owns each of the three results that are not
   a pass.

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

=============== FILE: reports/monorepo.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="monorepo" tests="11" failures="2" errors="1" time="19.884">
  <testsuite name="packages/api" tests="7" failures="1" errors="1" skipped="0" time="12.402">
    <testcase classname="api.health" name="responds 200" time="0.021"/>
    <testcase classname="api.health" name="reports the build sha" time="0.014"/>
    <testsuite name="packages/api/auth" tests="3" failures="1" errors="0" skipped="0" time="1.620">
      <testcase classname="api.auth.login" name="rejects a bad password" time="0.310"/>
      <testcase classname="api.auth.login" name="issues a token" time="0.290">
        <failure message="expected status 200 but was 401" type="AssertionError"/>
      </testcase>
      <testcase classname="api.auth.session" name="expires after the ttl" time="1.020"/>
    </testsuite>
    <testsuite name="packages/api/jobs" tests="2" failures="0" errors="1" skipped="0" time="10.747">
      <testcase classname="api.jobs.nightly" name="runs the nightly rollup" time="10.240">
        <error message="Connection refused: redis:6379" type="ECONNREFUSED"/>
      </testcase>
      <testcase classname="api.jobs.nightly" name="skips on a holiday" time="0.507"/>
    </testsuite>
  </testsuite>
  <testsuite name="packages/web" tests="4" failures="1" errors="0" skipped="0" time="7.482">
    <testcase classname="web.Cart" name="adds an item" time="1.204"/>
    <testcase classname="web.Cart" name="removes an item" time="1.180"/>
    <testcase classname="web.Checkout" name="submits the order" time="4.020">
      <failure message="expected the confirmation panel to be visible" type="AssertionError"/>
    </testcase>
    <testcase classname="web.Checkout" name="keeps the cart on failure" time="1.078"/>
  </testsuite>
</testsuites>
