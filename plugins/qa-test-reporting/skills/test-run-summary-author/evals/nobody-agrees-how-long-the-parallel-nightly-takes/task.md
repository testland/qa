# Two people have told me two different numbers for how long the nightly takes

## Problem Description

I post one line in #qa-nightly every morning saying how the nightly went, and I
have done for about a year. Two weeks ago we split the job across five parallel
runners, because the single-runner version had crept past half an hour and
people had stopped reading the post by the time it landed.

Since the split the post has been wrong about one thing and I cannot work out
which way. Our platform lead told Tuesday's standup that the nightly "takes
about forty minutes now, so parallelising bought us nothing, we should roll it
back". The engineer who did the parallelisation work says that figure is
nonsense and the job is finished long before that. They are reading the same
artifacts as each other, neither will budge, and I am the one who has to put a
number in the post tomorrow morning.

Last night's five shard files are attached, along with our CODEOWNERS so you can
see who owns what.

What the post needs:

- Where the nightly landed - counts and a rate.
- The three failures worth chasing today. There were seven and nobody is going
  to chase seven. Last time I just listed the first few as they came out of the
  files and two people told me I had sent their morning after the cheap ones
  while the expensive thing sat there all day.
- How long it took, as one number, and who should be picking up each of the
  three.

Keep the post short - it is a Slack message people read on their phone on the
way in, not a report. Underneath the post, put whatever settles the duration
argument for good, because I would like to never have this conversation again.

## Output Specification

1. `scripts/nightly.js` - reads the five files under `reports/` and writes
   `nightly.json` holding every figure the post quotes.
2. `test/nightly.test.js` - tests for what `scripts/nightly.js` computes,
   running under `npm test` alongside the test already in the repo. `npm test`
   must pass when you are done.
3. `docs/nightly-2026-09-12.md` - the post itself, then below it the short note
   that settles the duration question, written so the next person can recompute
   the figure without asking me.

Do not edit anything under `reports/`, and do not change `lib/junit.js` or
`test/junit.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "nightly-post",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: CODEOWNERS ===============
/e2e/admin/       @acme/platform-admin
/e2e/checkout/    @acme/payments
/e2e/orders/      @acme/orders
/e2e/profile/     @acme/identity
/e2e/search/      @acme/discovery
/e2e/wishlist/    @acme/discovery

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
  assert.equal(suites[0].timestamp, '2026-01-01T00:00:00');
});

test('assigns a status to every case', () => {
  const [suite] = parseJUnit(SAMPLE);
  assert.deepEqual(
    suite.cases.map((c) => c.status),
    ['passed', 'failed', 'skipped']
  );
  assert.equal(suite.cases[1].message, 'boom');
});

=============== FILE: reports/shard-1.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="nightly-e2e">
  <testsuite name="shard-1" tests="10" failures="1" errors="0" skipped="0" time="448.2" timestamp="2026-09-12T01:00:04">
    <testcase classname="e2e/orders/order-history.spec.ts" name="renders 200 orders" time="38.4">
      <failure message="expected 200 rows, received 100">AssertionError at order-history.spec.ts:46</failure>
    </testcase>
    <testcase classname="e2e/orders/order-detail.spec.ts" name="shows line items" time="52.1"/>
    <testcase classname="e2e/orders/order-detail.spec.ts" name="shows tracking" time="41.7"/>
    <testcase classname="e2e/orders/reorder.spec.ts" name="reorders previous order" time="36.9"/>
    <testcase classname="e2e/orders/invoice.spec.ts" name="downloads invoice" time="44.3"/>
    <testcase classname="e2e/orders/returns.spec.ts" name="starts a return" time="61.2"/>
    <testcase classname="e2e/orders/returns.spec.ts" name="cancels a return" time="39.8"/>
    <testcase classname="e2e/orders/order-history.spec.ts" name="filters by date" time="48.6"/>
    <testcase classname="e2e/orders/order-history.spec.ts" name="sorts by total" time="45.7"/>
    <testcase classname="e2e/orders/invoice.spec.ts" name="emails invoice" time="39.5"/>
  </testsuite>
</testsuites>

=============== FILE: reports/shard-2.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="nightly-e2e">
  <testsuite name="shard-2" tests="10" failures="2" errors="0" skipped="1" time="502.7" timestamp="2026-09-12T01:00:06">
    <testcase classname="e2e/checkout/guest.spec.ts" name="completes guest journey" time="121.9">
      <failure message="Timeout 120000ms exceeded waiting for [data-testid=order-confirmation]">TimeoutError at guest.spec.ts:112</failure>
    </testcase>
    <testcase classname="e2e/search/facets.spec.ts" name="facets narrow results" time="14.2">
      <failure message="expected 12 results after facet, received 40">AssertionError at facets.spec.ts:58</failure>
    </testcase>
    <testcase classname="e2e/search/facets.spec.ts" name="clears all facets" time="0">
      <skipped message="depends on facets narrow results"/>
    </testcase>
    <testcase classname="e2e/checkout/saved-card.spec.ts" name="completes with saved card" time="58.3"/>
    <testcase classname="e2e/checkout/address.spec.ts" name="validates address" time="62.4"/>
    <testcase classname="e2e/search/query.spec.ts" name="returns results" time="49.1"/>
    <testcase classname="e2e/checkout/tax.spec.ts" name="calculates tax" time="55.6"/>
    <testcase classname="e2e/search/query.spec.ts" name="paginates" time="47.8"/>
    <testcase classname="e2e/checkout/shipping.spec.ts" name="picks shipping option" time="51.2"/>
    <testcase classname="e2e/search/query.spec.ts" name="handles empty results" time="42.2"/>
  </testsuite>
</testsuites>

=============== FILE: reports/shard-3.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="nightly-e2e">
  <testsuite name="shard-3" tests="10" failures="1" errors="0" skipped="0" time="391.5" timestamp="2026-09-12T01:00:05">
    <testcase classname="e2e/profile/avatar.spec.ts" name="uploads avatar" time="9.8">
      <failure message="expected avatar url to be set, received empty string">AssertionError at avatar.spec.ts:33</failure>
    </testcase>
    <testcase classname="e2e/profile/settings.spec.ts" name="updates display name" time="44.2"/>
    <testcase classname="e2e/profile/settings.spec.ts" name="sets timezone" time="38.7"/>
    <testcase classname="e2e/profile/security.spec.ts" name="changes password" time="51.3"/>
    <testcase classname="e2e/profile/security.spec.ts" name="rotates api token" time="42.9"/>
    <testcase classname="e2e/profile/privacy.spec.ts" name="exports personal data" time="36.4"/>
    <testcase classname="e2e/profile/privacy.spec.ts" name="deletes account" time="47.1"/>
    <testcase classname="e2e/profile/notifications.spec.ts" name="toggles email alerts" time="39.6"/>
    <testcase classname="e2e/profile/notifications.spec.ts" name="toggles push alerts" time="43.8"/>
    <testcase classname="e2e/profile/settings.spec.ts" name="changes locale" time="37.7"/>
  </testsuite>
</testsuites>

=============== FILE: reports/shard-4.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="nightly-e2e">
  <testsuite name="shard-4" tests="10" failures="2" errors="0" skipped="0" time="613.8" timestamp="2026-09-12T01:00:09">
    <testcase classname="e2e/admin/bulk-import.spec.ts" name="imports 5k rows from csv" time="180.5">
      <failure message="Timeout 180000ms exceeded waiting for import job to report complete">TimeoutError at bulk-import.spec.ts:71</failure>
    </testcase>
    <testcase classname="e2e/admin/audit-log.spec.ts" name="paginates audit log" time="11.3">
      <failure message="expected page 2 to start at entry 51, received 41">AssertionError at audit-log.spec.ts:29</failure>
    </testcase>
    <testcase classname="e2e/admin/users.spec.ts" name="invites a user" time="54.7"/>
    <testcase classname="e2e/admin/users.spec.ts" name="deactivates a user" time="62.1"/>
    <testcase classname="e2e/admin/roles.spec.ts" name="assigns a role" time="48.9"/>
    <testcase classname="e2e/admin/roles.spec.ts" name="removes a role" time="57.3"/>
    <testcase classname="e2e/admin/billing.spec.ts" name="changes plan" time="51.8"/>
    <testcase classname="e2e/admin/billing.spec.ts" name="downloads receipts" time="45.2"/>
    <testcase classname="e2e/admin/audit-log.spec.ts" name="filters audit log" time="56.4"/>
    <testcase classname="e2e/admin/bulk-import.spec.ts" name="rejects malformed csv" time="45.6"/>
  </testsuite>
</testsuites>

=============== FILE: reports/shard-5.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="nightly-e2e">
  <testsuite name="shard-5" tests="10" failures="1" errors="0" skipped="1" time="470.1" timestamp="2026-09-12T01:00:04">
    <testcase classname="e2e/wishlist/sync.spec.ts" name="syncs across devices" time="16.7">
      <failure message="expected 3 items on device B, received 2">AssertionError at sync.spec.ts:94</failure>
    </testcase>
    <testcase classname="e2e/wishlist/share.spec.ts" name="shares a wishlist" time="0">
      <skipped message="feature flag wishlist_sharing is off in ci"/>
    </testcase>
    <testcase classname="e2e/wishlist/add.spec.ts" name="adds from product page" time="58.2"/>
    <testcase classname="e2e/wishlist/add.spec.ts" name="adds from search" time="61.4"/>
    <testcase classname="e2e/wishlist/remove.spec.ts" name="removes an item" time="53.9"/>
    <testcase classname="e2e/wishlist/move.spec.ts" name="moves item to cart" time="49.7"/>
    <testcase classname="e2e/wishlist/notify.spec.ts" name="notifies on price drop" time="62.3"/>
    <testcase classname="e2e/wishlist/notify.spec.ts" name="notifies on restock" time="55.1"/>
    <testcase classname="e2e/wishlist/sync.spec.ts" name="resolves sync conflict" time="57.6"/>
    <testcase classname="e2e/wishlist/add.spec.ts" name="adds from wishlist widget" time="55.2"/>
  </testsuite>
</testsuites>
