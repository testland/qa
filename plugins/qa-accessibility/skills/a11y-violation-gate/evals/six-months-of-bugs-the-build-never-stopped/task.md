# Four changes on the table and six months of bugs the build never stopped

## Problem Description

The accessibility check has been on since February. It carries a stored list of
findings we already know about and it fails the build on anything new. In six
months it has stopped exactly two pull requests, both a form control with nothing
for a screen reader to announce, both fixed inside the hour. Nobody has touched
the config since it went in.

Attached is every accessibility problem a customer or an internal reader has
reported to us since March, sixteen rows, with what our own scanner says about
that exact element on that page, checked by hand this week. Two of the sixteen
are the same problem reported twice by different people. Every row on that list
went out through a green build.

My director has the list now and she wants a number: of those sixteen, how many
would the check have stopped if it had been set up properly. She will quote
whatever I give her, so I want an honest one and I want to see how you got to it.

Four changes are on the table from three different people and I need a straight
answer on each, because they cannot all be right.

Priya wants `color-contrast` moved down to the warn tier. Her case is that the
design tokens are being reworked in Q4, there are twelve of these standing on
main today, and if contrast starts failing builds before that work lands we are
red every day until Christmas. She would put it back to blocking in January.

Tom wants `region` and `landmark-one-main` promoted to blocking. He has read the
inventory and they are the top two lines on it by a distance, thirty-one pages
and twenty-nine pages. His argument is that if we are going to be serious we
start with the biggest numbers.

Priya also wants `heading-order` left exactly where it is, at warn, on the
grounds that it is a moderate-impact rule and we already have more than we can
carry.

Dev wants `frame-title` and `html-has-lang` put in the blocking tier. Neither is
on the stored list at all and between them they affect three pages, which he says
makes them the cheapest thing on the board.

Two branch scans are attached, #5210 and #5188, and both are sitting there
waiting on me. There is one hard constraint. We publish six to ten marketing and
blog pages a month off a template that has never had a `<main>` element in it,
that is ticketed as WEB-4102, it is not landing before Q4, and if publishing a
blog post starts failing the build I will lose this check entirely - people will
merge around it inside a week.

The stored list stays as it is. I am not asking anyone to clear six months of
debt this week.

## Output Specification

1. Update `a11y-gate.config.json` and `scripts/a11y-gate.js` to match your
   decisions.
2. Run the check against both attached branch scans and write
   `docs/gate-retune.md`: your answer on each of the four changes with what in
   the evidence decided it, the number for the director with the rows it covers
   and the rows it does not, and the verdict for #5210 and for #5188 with the
   findings that drove each one.
3. Add test coverage for the tier decisions you made. The three tests already in
   `scripts/a11y-gate.test.js` must still pass.
4. `npm test` must pass when you are done. Do not edit either scan report and do
   not edit `a11y-baseline.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "docs-site-a11y",
  "version": "3.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: a11y-gate.config.json ===============
{
  "baseline": "a11y-baseline.json",
  "blockOn": ["critical"],
  "warnOn": [],
  "failOnWarning": true,
  "commentOnPr": true
}

=============== FILE: scripts/a11y-gate.js ===============
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'a11y-gate.config.json'), 'utf8'));
}

function fingerprint(r) {
  return r.scanner + '::' + r.rule_id + '::' + r.page_url + '::' + r.selector;
}

function readRecords(file) {
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const out = [];
  for (const page of run) {
    for (const v of page.violations) {
      for (const node of v.nodes) {
        const rec = {
          scanner: 'axe',
          rule_id: v.id,
          wcag_sc: v.tags[v.tags.length - 1],
          page_url: page.url,
          selector: node.target[0],
          severity: v.impact,
        };
        rec.fingerprint = fingerprint(rec);
        out.push(rec);
      }
    }
  }
  return out;
}

function classify(records, known, config) {
  const baseline = new Set(known);
  const fresh = records.filter((r) => !baseline.has(r.fingerprint));
  const blockOn = new Set(config.blockOn);
  const warnOn = new Set(config.warnOn);
  return {
    blockers: fresh.filter((r) => blockOn.has(r.severity)),
    warnings: fresh.filter((r) => warnOn.has(r.severity)),
    grandfathered: records.length - fresh.length,
  };
}

function verdict(result, config) {
  const failing = result.blockers.length > 0 ||
    (config.failOnWarning === true && result.warnings.length > 0);
  return failing ? 'no-go' : 'go';
}

if (require.main === module) {
  const config = loadConfig();
  const known = JSON.parse(fs.readFileSync(path.join(ROOT, config.baseline), 'utf8')).violations;
  const result = classify(readRecords(process.argv[2]), known, config);
  const v = verdict(result, config);
  console.log('# A11y check - verdict: ' + v.toUpperCase());
  console.log('blockers=' + result.blockers.length + ' warnings=' + result.warnings.length +
    ' grandfathered=' + result.grandfathered);
  for (const b of result.blockers) console.log('BLOCK ' + b.rule_id + ' ' + b.page_url + ' ' + b.selector);
  for (const w of result.warnings) console.log('WARN  ' + w.rule_id + ' ' + w.page_url + ' ' + w.selector);
  process.exit(v === 'go' ? 0 : 1);
}

module.exports = { loadConfig, fingerprint, readRecords, classify, verdict };

=============== FILE: scripts/a11y-gate.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprint, readRecords, classify } = require('./a11y-gate');

test('a finding is identified by scanner, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'region', page_url: '/docs', selector: 'body' }),
    'axe::region::/docs::body',
  );
});

test('the 5210 scan flattens to one record per offending element', () => {
  assert.equal(readRecords('reports/pr-5210-scan.json').length, 10);
});

test('a finding already on the known list is grandfathered, not re-reported', () => {
  const records = [
    { fingerprint: 'axe::color-contrast::/docs::code.inline', severity: 'serious' },
    { fingerprint: 'axe::label::/::input#brand-new', severity: 'critical' },
  ];
  const result = classify(records, ['axe::color-contrast::/docs::code.inline'], {
    blockOn: ['critical'],
    warnOn: ['moderate'],
  });
  assert.equal(result.grandfathered, 1);
  assert.deepEqual(result.blockers.map((r) => r.fingerprint), ['axe::label::/::input#brand-new']);
});

=============== FILE: a11y-baseline.json ===============
{
  "version": 1,
  "updated_at": "2026-02-11T09:00:00Z",
  "violations": [
    "axe::color-contrast::/docs::code.inline",
    "axe::link-name::/docs::a.edit-page",
    "axe::region::/docs::body",
    "axe::landmark-one-main::/docs::body",
    "axe::heading-order::/docs::h4.api-note",
    "axe::color-contrast::/pricing::span.per-seat",
    "axe::region::/pricing::body",
    "axe::label::/::input#newsletter"
  ]
}

=============== FILE: reports/escaped-issues.md ===============
# Accessibility problems reported to support, March - August 2026

Every row below reached a user. Every row below shipped through a green build.
The last column is the scanner's own output for that exact element on that page,
re-checked by hand this week.

| #  | Reported   | Page              | What they told us                                                   | Scanner output for that element |
|----|------------|-------------------|---------------------------------------------------------------------|---------------------------------|
| 1  | 2026-03-04 | /checkout         | "the Place order button is grey on grey, I cannot read it"           | color-contrast, impact serious  |
| 2  | 2026-03-19 | /docs/api         | "headings jump from h2 straight to h4, I cannot skim the page"       | heading-order, impact moderate  |
| 3  | 2026-04-02 | /pricing          | "the per-seat line is too faint to read on my laptop"                | color-contrast, impact serious  |
| 4  | 2026-04-08 | /login            | "the sign-in frame is just announced as 'frame'"                     | frame-title, impact serious     |
| 5  | 2026-04-21 | /docs/sdk         | "same heading jump as the API page"                                  | heading-order, impact moderate  |
| 6  | 2026-05-05 | /blog/spring-note | "body text on the post is washed out"                                | color-contrast, impact serious  |
| 7  | 2026-05-06 | /blog/spring-note | same as 6, different reporter                                        | color-contrast, impact serious  |
| 8  | 2026-05-12 | /pricing          | "the comparison charts have alt text but it just reads chart-1.png"  | image-alt: pass. `<img src="chart-1.png" alt="chart-1.png">` |
| 9  | 2026-05-30 | /account          | "the settings icon link is announced as just 'link'"                 | link-name, impact serious       |
| 10 | 2026-06-11 | /                 | "my screen reader reads the whole page in the wrong language"        | html-has-lang, impact serious   |
| 11 | 2026-06-18 | /docs             | "every link in the sidebar is 'read more', I cannot tell them apart" | link-name: pass. `<a href="/docs/webhooks">read more</a>`, and three siblings like it |
| 12 | 2026-06-24 | /docs/webhooks    | "same heading jump again"                                            | heading-order, impact moderate  |
| 13 | 2026-07-02 | /account          | same as 9, different reporter                                        | link-name, impact serious       |
| 14 | 2026-07-15 | /support          | "the help widget frame has no title"                                 | frame-title, impact serious     |
| 15 | 2026-07-29 | /webinars         | "the recorded sessions have no captions"                             | video-caption: `"score": null, "scoreDisplayMode": "manual"` |
| 16 | 2026-08-27 | /dashboard        | "opening the filter drawer drops focus at the bottom of the page"    | full scan of /dashboard: 0 violations, 94 passes, 3 incomplete |

Rows 2, 5, 11, 12 and 16 came from screen-reader users; the rest from sighted
customers or internal readers.

For the same period the check itself blocked two pull requests, both for a form
control with no accessible name, and neither of those ever reached a user.

=============== FILE: reports/moderate-inventory.md ===============
# What is currently standing on main, by rule

Full scan of main, 2026-09-09, 61 pages.

| Rule                | Pages affected | On the stored list? | Notes                                   |
|---------------------|----------------|---------------------|-----------------------------------------|
| region              | 31             | 2 of 31             | every page built from the page template |
| landmark-one-main   | 29             | 1 of 29             | same template, same cause               |
| heading-order       | 7              | 1 of 7              | all 7 on /docs/*                        |
| color-contrast      | 12             | 2 of 12             | design-token work, scheduled Q4         |
| link-name           | 4              | 1 of 4              |                                         |
| frame-title         | 2              | 0 of 2              | support widget iframes                  |
| html-has-lang       | 1              | 0 of 1              |                                         |

The template gap (no `<main>` element) is ticketed as WEB-4102 and is scheduled
for Q4. Until it lands, every new page we publish arrives with a `region` and a
`landmark-one-main` finding on the day it goes live. We published 27 new pages
last quarter.

=============== FILE: reports/pr-5210-scan.json ===============
[
  {
    "url": "/docs",
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "tags": ["cat.color", "wcag2aa", "wcag143"],
        "nodes": [{ "target": ["code.inline"] }]
      },
      {
        "id": "link-name",
        "impact": "serious",
        "tags": ["cat.name-role-value", "wcag2a", "wcag412"],
        "nodes": [{ "target": ["a.edit-page"] }]
      },
      {
        "id": "region",
        "impact": "moderate",
        "tags": ["cat.keyboard", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      },
      {
        "id": "landmark-one-main",
        "impact": "moderate",
        "tags": ["cat.semantics", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      },
      {
        "id": "heading-order",
        "impact": "moderate",
        "tags": ["cat.semantics", "best-practice", "wcag131"],
        "nodes": [{ "target": ["h4.api-note"] }, { "target": ["h4.sdk-note"] }]
      }
    ]
  },
  {
    "url": "/pricing",
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "tags": ["cat.color", "wcag2aa", "wcag143"],
        "nodes": [{ "target": ["span.per-seat"] }, { "target": ["span.annual-note"] }]
      },
      {
        "id": "region",
        "impact": "moderate",
        "tags": ["cat.keyboard", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      }
    ]
  },
  {
    "url": "/blog/q3-recap",
    "violations": [
      {
        "id": "region",
        "impact": "moderate",
        "tags": ["cat.keyboard", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      }
    ]
  }
]

=============== FILE: reports/pr-5188-scan.json ===============
[
  {
    "url": "/docs",
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "tags": ["cat.color", "wcag2aa", "wcag143"],
        "nodes": [{ "target": ["code.inline"] }]
      },
      {
        "id": "link-name",
        "impact": "serious",
        "tags": ["cat.name-role-value", "wcag2a", "wcag412"],
        "nodes": [{ "target": ["a.edit-page"] }]
      },
      {
        "id": "region",
        "impact": "moderate",
        "tags": ["cat.keyboard", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      },
      {
        "id": "landmark-one-main",
        "impact": "moderate",
        "tags": ["cat.semantics", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      },
      {
        "id": "heading-order",
        "impact": "moderate",
        "tags": ["cat.semantics", "best-practice", "wcag131"],
        "nodes": [{ "target": ["h4.api-note"] }]
      }
    ]
  },
  {
    "url": "/pricing",
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "tags": ["cat.color", "wcag2aa", "wcag143"],
        "nodes": [{ "target": ["span.per-seat"] }]
      },
      {
        "id": "region",
        "impact": "moderate",
        "tags": ["cat.keyboard", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      }
    ]
  },
  {
    "url": "/blog/hiring-day",
    "violations": [
      {
        "id": "region",
        "impact": "moderate",
        "tags": ["cat.keyboard", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      },
      {
        "id": "landmark-one-main",
        "impact": "moderate",
        "tags": ["cat.semantics", "best-practice", "wcag131"],
        "nodes": [{ "target": ["body"] }]
      }
    ]
  }
]
