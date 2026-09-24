# Retro is Friday and the nightly job only produced two artifacts all sprint

## Problem Description

Sprint 41 ends Friday. I run the retro and I have twenty minutes at the top of
it for "how did the quality go", which for the last three sprints I have filled
by eyeballing Slack and saying something vague. I want to stop doing that.

The problem is the nightly job. It ran on Monday 1 September, then the runner
image change on the 2nd broke artifact upload and nobody noticed until Friday
morning, so the runs on the 2nd, 3rd and 4th completed but uploaded nothing.
What survived is Monday's XML and Friday's XML. Those two files are attached and
there is no way to get the middle three back - the workspaces are gone.

What I want out of this, in the order I would say it in the room:

1. The trend across the sprint. Are we getting better or worse? This is the bit
   the team actually argues about and I would like to open with it.
2. What changed between Monday and Friday. Specifically which tests went bad,
   because two people are going to say "that was already failing" and I want to
   be able to answer.
3. The number I put on the board next to "Sprint 41".

Some context that matters for reading the files: a couple of specs were added
during the sprint, and we quarantined one spec mid-week under QA-5512 because
it was flapping on the new runner image. So the two files do not contain
exactly the same set of tests, which is part of why I have not tried to do this
by hand.

## Output Specification

1. `scripts/run-diff.js` - reads `reports/nightly-2026-09-01.xml` and
   `reports/nightly-2026-09-05.xml` and writes `run-diff.json` holding whatever
   the retro document claims about what changed.
2. `test/run-diff.test.js` - tests for the comparison logic, running under
   `npm test` alongside the test already in the repo. `npm test` must pass when
   you are done.
3. `docs/retro-2026-09-05.md` - what I read out, in my three-point order above,
   with each claim attributable to one or both of the attached files.

Do not edit anything under `reports/`, and do not change `lib/junit.js` or
`test/junit.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "sprint-quality-reporting",
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

=============== FILE: reports/nightly-2026-09-01.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="acme-web nightly" tests="38" failures="3" errors="0" skipped="2" time="63.72">
  <testsuite name="cart" tests="8" failures="1" errors="0" skipped="0" time="11.88" timestamp="2026-09-01T02:00:06">
    <testcase classname="cart" name="adds item" time="1.12"/>
    <testcase classname="cart" name="removes item" time="0.94"/>
    <testcase classname="cart" name="updates quantity" time="1.31"/>
    <testcase classname="cart" name="applies bulk discount" time="2.44">
      <failure message="expected line total 89.10, received 91.00">AssertionError at cart.spec.ts:142</failure>
    </testcase>
    <testcase classname="cart" name="merges guest cart on login" time="1.87"/>
    <testcase classname="cart" name="persists across reload" time="1.55"/>
    <testcase classname="cart" name="clears cart" time="1.02"/>
    <testcase classname="cart" name="shows stock warning" time="1.63"/>
  </testsuite>
  <testsuite name="checkout" tests="8" failures="0" errors="0" skipped="0" time="15.40" timestamp="2026-09-01T02:00:18">
    <testcase classname="checkout" name="completes with saved card" time="2.61"/>
    <testcase classname="checkout" name="validates address" time="1.74"/>
    <testcase classname="checkout" name="blocks empty cart" time="1.19"/>
    <testcase classname="checkout" name="calculates tax" time="1.96"/>
    <testcase classname="checkout" name="applies shipping" time="2.08"/>
    <testcase classname="checkout" name="shows order summary" time="1.47"/>
    <testcase classname="checkout" name="sends confirmation" time="2.33"/>
    <testcase classname="checkout" name="exports order csv" time="2.02"/>
  </testsuite>
  <testsuite name="search" tests="7" failures="1" errors="0" skipped="1" time="9.94" timestamp="2026-09-01T02:00:34">
    <testcase classname="search" name="returns results" time="1.28"/>
    <testcase classname="search" name="paginates" time="1.05"/>
    <testcase classname="search" name="ranks by relevance" time="3.71">
      <failure message="expected first result id 8841, received 9013">AssertionError at search.spec.ts:77</failure>
    </testcase>
    <testcase classname="search" name="filters by category" time="1.44"/>
    <testcase classname="search" name="sorts by price" time="1.32"/>
    <testcase classname="search" name="shows typeahead suggestions" time="0">
      <skipped message="feature flag typeahead_v2 is off in ci"/>
    </testcase>
    <testcase classname="search" name="handles empty results" time="1.14"/>
  </testsuite>
  <testsuite name="inventory" tests="7" failures="0" errors="0" skipped="1" time="12.06" timestamp="2026-09-01T02:00:44">
    <testcase classname="inventory" name="decrements on order" time="2.18"/>
    <testcase classname="inventory" name="restocks on cancel" time="1.92"/>
    <testcase classname="inventory" name="reserves during checkout" time="2.41"/>
    <testcase classname="inventory" name="releases expired reservation" time="2.07"/>
    <testcase classname="inventory" name="shows low stock badge" time="1.66"/>
    <testcase classname="inventory" name="syncs with warehouse feed" time="0">
      <skipped message="vendor sandbox down, see OPS-2210"/>
    </testcase>
    <testcase classname="inventory" name="audits stock changes" time="1.82"/>
  </testsuite>
  <testsuite name="profile" tests="8" failures="1" errors="0" skipped="0" time="14.44" timestamp="2026-09-01T02:00:56">
    <testcase classname="profile" name="updates display name" time="1.33"/>
    <testcase classname="profile" name="uploads avatar" time="2.86"/>
    <testcase classname="profile" name="changes email with confirmation" time="2.14"/>
    <testcase classname="profile" name="changes password" time="1.71"/>
    <testcase classname="profile" name="deletes account" time="1.58"/>
    <testcase classname="profile" name="exports personal data" time="2.02"/>
    <testcase classname="profile" name="sets timezone" time="1.05"/>
    <testcase classname="profile" name="regenerates api token" time="1.75">
      <failure message="expected 201, received 500">AssertionError at profile.spec.ts:203</failure>
    </testcase>
  </testsuite>
</testsuites>

=============== FILE: reports/nightly-2026-09-05.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="acme-web nightly" tests="40" failures="5" errors="0" skipped="2" time="67.15">
  <testsuite name="cart" tests="9" failures="1" errors="0" skipped="0" time="13.76" timestamp="2026-09-05T02:00:05">
    <testcase classname="cart" name="adds item" time="1.09"/>
    <testcase classname="cart" name="removes item" time="0.97"/>
    <testcase classname="cart" name="updates quantity" time="1.28"/>
    <testcase classname="cart" name="applies bulk discount" time="2.51">
      <failure message="expected line total 89.10, received 91.00">AssertionError at cart.spec.ts:142</failure>
    </testcase>
    <testcase classname="cart" name="merges guest cart on login" time="1.91"/>
    <testcase classname="cart" name="persists across reload" time="1.49"/>
    <testcase classname="cart" name="clears cart" time="1.06"/>
    <testcase classname="cart" name="shows stock warning" time="1.57"/>
    <testcase classname="cart" name="applies stacked coupons" time="1.88"/>
  </testsuite>
  <testsuite name="checkout" tests="9" failures="1" errors="0" skipped="1" time="16.62" timestamp="2026-09-05T02:00:19">
    <testcase classname="checkout" name="completes with saved card" time="2.58"/>
    <testcase classname="checkout" name="validates address" time="1.77"/>
    <testcase classname="checkout" name="blocks empty cart" time="1.22"/>
    <testcase classname="checkout" name="calculates tax" time="1.94"/>
    <testcase classname="checkout" name="applies shipping" time="2.11"/>
    <testcase classname="checkout" name="shows order summary" time="1.51"/>
    <testcase classname="checkout" name="sends confirmation" time="2.29"/>
    <testcase classname="checkout" name="exports order csv" time="0">
      <skipped message="quarantined 2026-09-03 under QA-5512, flapping on runner image 2026.09"/>
    </testcase>
    <testcase classname="checkout" name="splits payment across cards" time="3.20">
      <failure message="expected two charge records, received 1">AssertionError at checkout.spec.ts:318</failure>
    </testcase>
  </testsuite>
  <testsuite name="search" tests="7" failures="0" errors="0" skipped="1" time="10.31" timestamp="2026-09-05T02:00:37">
    <testcase classname="search" name="returns results" time="1.31"/>
    <testcase classname="search" name="paginates" time="1.08"/>
    <testcase classname="search" name="ranks by relevance" time="3.84"/>
    <testcase classname="search" name="filters by category" time="1.47"/>
    <testcase classname="search" name="sorts by price" time="1.35"/>
    <testcase classname="search" name="shows typeahead suggestions" time="0">
      <skipped message="feature flag typeahead_v2 is off in ci"/>
    </testcase>
    <testcase classname="search" name="handles empty results" time="1.26"/>
  </testsuite>
  <testsuite name="inventory" tests="7" failures="1" errors="0" skipped="0" time="12.88" timestamp="2026-09-05T02:00:48">
    <testcase classname="inventory" name="decrements on order" time="2.26">
      <failure message="expected stock 41, received 42">AssertionError at inventory.spec.ts:59</failure>
    </testcase>
    <testcase classname="inventory" name="restocks on cancel" time="1.88"/>
    <testcase classname="inventory" name="reserves during checkout" time="2.37"/>
    <testcase classname="inventory" name="releases expired reservation" time="2.11"/>
    <testcase classname="inventory" name="shows low stock badge" time="1.62"/>
    <testcase classname="inventory" name="syncs with warehouse feed" time="0.78"/>
    <testcase classname="inventory" name="audits stock changes" time="1.86"/>
  </testsuite>
  <testsuite name="profile" tests="8" failures="2" errors="0" skipped="0" time="13.58" timestamp="2026-09-05T02:01:01">
    <testcase classname="profile" name="updates display name" time="1.29"/>
    <testcase classname="profile" name="uploads avatar" time="2.04">
      <failure message="expected avatar url to match /cdn/.*\.png, received ''">AssertionError at profile.spec.ts:88</failure>
    </testcase>
    <testcase classname="profile" name="changes email with confirmation" time="2.11"/>
    <testcase classname="profile" name="changes password" time="1.68"/>
    <testcase classname="profile" name="deletes account" time="1.54"/>
    <testcase classname="profile" name="exports personal data" time="1.98"/>
    <testcase classname="profile" name="sets timezone" time="1.09"/>
    <testcase classname="profile" name="regenerates api token" time="1.85">
      <failure message="expected 201, received 500">AssertionError at profile.spec.ts:203</failure>
    </testcase>
  </testsuite>
</testsuites>
