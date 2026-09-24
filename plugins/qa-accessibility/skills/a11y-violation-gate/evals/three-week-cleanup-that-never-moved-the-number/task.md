# Three weeks of cleanup and the number in CI has not moved

## Problem Description

We just finished a three-week push on accessibility debt. The board says nine
findings closed, each with a ticket and a merged PR against it. The check that
runs on every PR still prints the same line it printed in August: `known
findings: 13`. On Friday our VP asked me why three weeks of work did not move a
number, in front of people, and I did not have an answer for her. The
accessibility review is Thursday and I am presenting.

Part of the answer is embarrassing and simple: nobody has touched the stored list
since it was written in August. I do not think anyone knew they were supposed to,
and it is not written down anywhere that they should.

The other part I cannot explain at all. Since the sprint closed, the check has
started blocking PRs on `/checkout` and `/cart` over findings on elements nobody
recognises, and two people have asked me this week whether they broke something
on a branch that does not go near those pages. Those same three weeks also
included the design-system migration, which touched the checkout and cart
templates, so I have attached the rename note along with everything else in case
it is relevant.

Attached: the stored list, the sprint board, the rename note, and this morning's
scan of `main`.

Give me the number for Thursday, fix the list, and show the arithmetic. She will
ask how I got there, and "the tool said so" is not going to do it twice.

## Output Specification

1. `docs/a11y-sprint-report.md` - the number to take into Thursday's review, with
   the arithmetic behind it: what was genuinely fixed, what is still outstanding,
   anything that arrived during the three weeks, and what the unrecognised
   blockers on `/checkout` and `/cart` actually are.
2. The corrected `a11y-baseline.json`.
3. `docs/a11y-list-maintenance.md` - the one page that was missing, saying who
   updates the stored list and when, so this does not recur next quarter.
4. `node scripts/a11y-gate.js reports/latest-scan.json` must exit non-zero when
   you are done, and `npm test` must pass. Do not edit
   `reports/latest-scan.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "portal-a11y",
  "version": "5.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: scripts/a11y-gate.js ===============
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BLOCK = new Set(['critical', 'serious']);

function fingerprint(r) {
  return r.scanner + '::' + r.rule_id + '::' + r.page_url + '::' + r.selector;
}

function loadScan(file) {
  const records = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  return records.map((r) => ({ ...r, fingerprint: fingerprint(r) }));
}

function evaluate(records, known) {
  const baseline = new Set(known);
  const seen = new Set(records.map((r) => r.fingerprint));
  const fresh = records.filter((r) => !baseline.has(r.fingerprint));
  return {
    blockers: fresh.filter((r) => BLOCK.has(r.severity)),
    warnings: fresh.filter((r) => r.severity === 'moderate'),
    grandfathered: records.length - fresh.length,
    fixed: [...baseline].filter((f) => !seen.has(f)),
  };
}

if (require.main === module) {
  const known = JSON.parse(fs.readFileSync(path.join(ROOT, 'a11y-baseline.json'), 'utf8')).violations;
  const r = evaluate(loadScan(process.argv[2] || 'reports/latest-scan.json'), known);
  console.log('known findings: ' + known.length);
  console.log('blockers=' + r.blockers.length + ' warnings=' + r.warnings.length +
    ' grandfathered=' + r.grandfathered + ' fixed=' + r.fixed.length);
  for (const b of r.blockers) console.log('BLOCK ' + b.rule_id + ' ' + b.page_url + ' ' + b.selector);
  process.exit(r.blockers.length ? 1 : 0);
}

module.exports = { fingerprint, loadScan, evaluate };

=============== FILE: scripts/a11y-gate.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint, loadScan, evaluate } = require('./a11y-gate');

test('a finding is identified by scanner, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'region', page_url: '/dashboard', selector: 'body' }),
    'axe::region::/dashboard::body',
  );
});

test('this morning scan carries six findings', () => {
  assert.equal(loadScan('reports/latest-scan.json').length, 6);
});

test('a listed finding is grandfathered and an unlisted serious one blocks', () => {
  const records = [
    { fingerprint: 'axe::region::/dashboard::body', severity: 'moderate' },
    { fingerprint: 'axe::color-contrast::/new::span.x', severity: 'serious' },
  ];
  const r = evaluate(records, ['axe::region::/dashboard::body']);
  assert.equal(r.grandfathered, 1);
  assert.equal(r.blockers.length, 1);
  assert.equal(r.fixed.length, 0);
});

=============== FILE: a11y-baseline.json ===============
{
  "version": 1,
  "updated_at": "2026-08-14T16:20:00Z",
  "violations": [
    "axe::color-contrast::/checkout::button.primary",
    "axe::color-contrast::/checkout::a.help-link",
    "axe::color-contrast::/cart::button.remove",
    "axe::label::/signup::input#email",
    "axe::label::/signup::input#password",
    "axe::aria-required-attr::/dashboard::div[role=\"dialog\"]",
    "axe::image-alt::/marketing::img.hero",
    "axe::image-alt::/marketing::img.badge",
    "axe::link-name::/help::a.social-x",
    "axe::heading-order::/blog::h4.post-sub",
    "axe::color-contrast::/legacy::span.muted",
    "axe::label::/legacy::input#q",
    "axe::region::/dashboard::body"
  ]
}

=============== FILE: reports/latest-scan.json ===============
[
  {
    "scanner": "axe",
    "rule_id": "color-contrast",
    "wcag_sc": "1.4.3",
    "page_url": "/checkout",
    "selector": "button.btn-primary",
    "severity": "serious",
    "detail": "contrast ratio 3.8:1, expected 4.5:1 (#8a8f98 on #f2f4f7)"
  },
  {
    "scanner": "axe",
    "rule_id": "color-contrast",
    "wcag_sc": "1.4.3",
    "page_url": "/cart",
    "selector": "button.btn-remove",
    "severity": "serious",
    "detail": "contrast ratio 4.1:1, expected 4.5:1 (#7f868f on #ffffff)"
  },
  {
    "scanner": "axe",
    "rule_id": "label",
    "wcag_sc": "4.1.2",
    "page_url": "/signup",
    "selector": "input#password",
    "severity": "critical",
    "detail": "form element has no label"
  },
  {
    "scanner": "axe",
    "rule_id": "image-alt",
    "wcag_sc": "1.1.1",
    "page_url": "/marketing",
    "selector": "img.badge",
    "severity": "critical",
    "detail": "image has no alt attribute"
  },
  {
    "scanner": "axe",
    "rule_id": "region",
    "wcag_sc": "1.3.1",
    "page_url": "/dashboard",
    "selector": "body",
    "severity": "moderate",
    "detail": "some page content is not contained by landmarks"
  },
  {
    "scanner": "axe",
    "rule_id": "color-contrast",
    "wcag_sc": "1.4.3",
    "page_url": "/pricing",
    "selector": "span.annual-note",
    "severity": "serious",
    "detail": "contrast ratio 2.9:1, expected 4.5:1 (#9aa0a6 on #ffffff)"
  }
]

=============== FILE: reports/sprint-board.md ===============
# Accessibility debt sprint - 24 Aug to 11 Sep

Board state at close. Every ticket below is Done with a merged PR.

| Ticket   | Title                                               | Closed by | Merged     |
|----------|-----------------------------------------------------|-----------|------------|
| A11Y-214 | Contrast on the checkout primary button             | #3390     | 2026-08-27 |
| A11Y-215 | Contrast on the checkout help link                  | #3402     | 2026-08-29 |
| A11Y-216 | Signup email field has no label                     | #3411     | 2026-09-01 |
| A11Y-218 | Dashboard dialog missing aria-labelledby            | #3419     | 2026-09-02 |
| A11Y-219 | Marketing hero image has no alt text                | #3421     | 2026-09-03 |
| A11Y-220 | Empty social link on the help page                  | #3424     | 2026-09-04 |
| A11Y-221 | Heading order in the blog post template             | #3430     | 2026-09-05 |
| A11Y-223 | Contrast on legacy search results                   | #3437     | 2026-09-09 |
| A11Y-224 | Legacy search input has no accessible name          | #3441     | 2026-09-10 |

Not closed this sprint and still open on the board: A11Y-217 (signup password
field label), A11Y-222 (marketing partner badge alt text), A11Y-225 (dashboard
landmark structure).

Merged during the same window but not part of the sprint: #3396 (pricing page
annual-billing note), #3404 (invoice PDF export), #3428 (session timeout banner).

The nightly scan covers the same nine templates it has crawled since June. No
page was added to or removed from the crawl during the sprint, and `/checkout`,
`/cart`, `/signup`, `/marketing`, `/dashboard`, `/pricing`, `/help`, `/blog` and
`/legacy` were all scanned this morning.

=============== FILE: reports/design-system-migration.md ===============
# Design system migration - merged 2026-08-27

Mechanical rename of component classes on the checkout and cart templates onto
the new `btn-` / `link-` prefixes. No colour, spacing or markup structure changed
here - it is class names and nothing else. Colour-token work was deliberately
kept out of this change and went in separately afterwards so it could be reviewed
on its own.

| Template          | Old class        | New class            |
|-------------------|------------------|----------------------|
| checkout/summary  | `button.primary` | `button.btn-primary` |
| checkout/summary  | `a.help-link`    | `a.link-help`        |
| checkout/summary  | `div.summary`    | `div.order-summary`  |
| cart/line-item    | `button.remove`  | `button.btn-remove`  |
| cart/line-item    | `span.qty`       | `span.item-qty`      |
