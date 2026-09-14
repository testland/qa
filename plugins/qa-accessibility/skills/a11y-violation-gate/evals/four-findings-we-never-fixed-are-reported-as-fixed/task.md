# Four things we never fixed are being reported as fixed

## Problem Description

We scan with three tools. Until two weeks ago it was four - the hosted one came
up for renewal on 1 September and we let it lapse, because the other three were
finding everything it found. The first full run after that is attached, along
with what the check printed and the list of known findings it compared against.

What it printed was eight new blockers and four fixed. Nobody fixed anything.
Nobody has touched those two pages except Ravi, on #812, and his change is
twenty lines of markup on the tax line. Going through the eight:

- Two of them look real to me. They are on the bits #812 actually touched.
- Two of them are rows where the element should be and it says `undefined`
  instead. I assume that is a bug in how we read one of the reports.
- The other four are, as far as I can work out, the same four things it is
  reporting as fixed in the line above. I can open the site right now and see
  every one of them.

The merge step is attached too. It was written back when we ran two tools and
its whole job was to stop the PR comment listing the same button three times
under three different names, which it does do. I am not going back to a comment
that lists the same button three times, and I am also not shipping a check that
invents fixes - our quarterly accessibility number comes off that counter and
somebody presents it.

Give me a merge and a stored list I can trust, the real verdict on #812, and
something I can hand whoever next adds or drops a tool from this pipeline,
because it will happen again.

## Output Specification

1. Rewrite `scripts/merge-findings.js`. `node scripts/merge-findings.js` must
   still write `reports/merged.json`.
2. Deliver the corrected `a11y-baseline.json`.
3. `docs/pr-812-a11y.md` - the PR comment for #812: what blocks, what is
   grandfathered, what was fixed, and what the reviewer should do.
4. `docs/scanner-change-note.md` - what dropping the hosted tool did to the
   numbers, and what has to happen the next time a tool joins or leaves.
5. `npm test` must pass, and after your rewrite
   `node scripts/merge-findings.js && node scripts/a11y-gate.js` must exit
   non-zero. Do not edit the three report files under `reports/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "shop-a11y-pipeline",
  "version": "4.2.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: scripts/merge-findings.js ===============
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Read order matters - first writer wins. Unchanged since we ran two tools.
const SCANNERS = ['wave', 'axe', 'pa11y', 'lighthouse'];

// Each runner is configured with a base URL, so every report gives us
// site-relative paths and we do not have to normalise hosts here.
const CANONICAL = {
  contrast: 'color-contrast',
  link_empty: 'link-name',
  'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': 'color-contrast',
  'WCAG2A.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId': 'link-name',
};

function canonical(ruleId) {
  return CANONICAL[ruleId] || ruleId;
}

function fingerprint(r) {
  return r.scanner + '::' + r.rule_id + '::' + r.page_url + '::' + r.selector;
}

function stamp(records) {
  return records.map((r) => ({ ...r, fingerprint: fingerprint(r) }));
}

function readAxe() {
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/axe.json'), 'utf8'));
  const out = [];
  for (const page of run) {
    for (const v of page.violations) {
      for (const node of v.nodes) {
        out.push({
          scanner: 'axe',
          rule_id: v.id,
          wcag_sc: v.tags[v.tags.length - 1],
          page_url: page.url,
          selector: node.target[0],
          severity: v.impact,
        });
      }
    }
  }
  return stamp(out);
}

function readPa11y() {
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/pa11y.json'), 'utf8'));
  const out = [];
  for (const [url, issues] of Object.entries(run.results)) {
    for (const issue of issues) {
      out.push({
        scanner: 'pa11y',
        rule_id: issue.code,
        wcag_sc: issue.code.split('.').slice(1, 4).join('.'),
        page_url: url,
        selector: issue.selector,
        severity: issue.type === 'error' ? 'serious' : 'moderate',
      });
    }
  }
  return stamp(out);
}

function readLighthouse() {
  const runs = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/lighthouse.json'), 'utf8'));
  const out = [];
  for (const lhr of runs) {
    for (const audit of Object.values(lhr.audits)) {
      if (audit.score === 1) continue;
      const items = (audit.details && audit.details.items) || [{}];
      for (const item of items) {
        out.push({
          scanner: 'lighthouse',
          rule_id: audit.id,
          wcag_sc: null,
          page_url: lhr.requestedUrl,
          selector: item.node ? item.node.selector : undefined,
          severity: 'serious',
        });
      }
    }
  }
  return stamp(out);
}

const READERS = { axe: readAxe, pa11y: readPa11y, lighthouse: readLighthouse };

function readScanner(name) {
  if (!READERS[name]) return [];
  if (!fs.existsSync(path.join(ROOT, 'reports', name + '.json'))) return [];
  return READERS[name]();
}

function merge() {
  const byKey = new Map();
  for (const scanner of SCANNERS) {
    for (const rec of readScanner(scanner)) {
      const key = canonical(rec.rule_id) + '::' + rec.selector;
      if (!byKey.has(key)) byKey.set(key, rec);
    }
  }
  return [...byKey.values()];
}

if (require.main === module) {
  const merged = merge();
  fs.writeFileSync(path.join(ROOT, 'reports/merged.json'), JSON.stringify(merged, null, 2) + '\n');
  console.log('merged ' + merged.length + ' findings');
}

module.exports = { canonical, fingerprint, merge, readAxe, readPa11y, readLighthouse };

=============== FILE: scripts/a11y-gate.js ===============
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BLOCK = new Set(['critical', 'serious']);

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
  const merged = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/merged.json'), 'utf8'));
  const known = JSON.parse(fs.readFileSync(path.join(ROOT, 'a11y-baseline.json'), 'utf8')).violations;
  const r = evaluate(merged, known);
  console.log('# A11y check - verdict: ' + (r.blockers.length ? 'NO-GO' : 'GO'));
  console.log('blockers=' + r.blockers.length + ' warnings=' + r.warnings.length +
    ' grandfathered=' + r.grandfathered + ' fixed=' + r.fixed.length);
  for (const b of r.blockers) console.log('BLOCK ' + b.scanner + ' ' + b.rule_id + ' ' + b.page_url + ' ' + b.selector);
  for (const f of r.fixed) console.log('FIXED ' + f);
  process.exit(r.blockers.length ? 1 : 0);
}

module.exports = { evaluate };

=============== FILE: scripts/merge-findings.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonical, fingerprint, readAxe } = require('./merge-findings');

test('the two tools name the same contrast rule differently', () => {
  assert.equal(canonical('WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'), 'color-contrast');
  assert.equal(canonical('color-contrast'), 'color-contrast');
});

test('a finding is identified by tool, rule, page and element', () => {
  assert.equal(
    fingerprint({ scanner: 'axe', rule_id: 'link-name', page_url: '/checkout', selector: 'a.icon-cart' }),
    'axe::link-name::/checkout::a.icon-cart',
  );
});

test('the axe report flattens to one record per offending element', () => {
  assert.equal(readAxe().length, 7);
});

=============== FILE: a11y-baseline.json ===============
{
  "version": 1,
  "updated_at": "2026-06-30T10:02:00Z",
  "violations": [
    "wave::contrast::/checkout::button.primary",
    "wave::contrast::/checkout::a.footer-legal",
    "wave::link_empty::/checkout::a.icon-cart",
    "wave::contrast::/pricing::span.per-seat"
  ]
}

=============== FILE: reports/axe.json ===============
[
  {
    "url": "/checkout",
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "tags": ["cat.color", "wcag2aa", "wcag143"],
        "nodes": [
          { "target": ["button.primary"] },
          { "target": ["a.footer-legal"] },
          { "target": ["span.tax-note"] }
        ]
      },
      {
        "id": "link-name",
        "impact": "serious",
        "tags": ["cat.name-role-value", "wcag2a", "wcag412"],
        "nodes": [{ "target": ["a.icon-cart"] }]
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
        "nodes": [{ "target": ["a.footer-legal"] }, { "target": ["span.per-seat"] }]
      },
      {
        "id": "aria-required-attr",
        "impact": "critical",
        "tags": ["cat.aria", "wcag2a", "wcag412"],
        "nodes": [{ "target": ["div[role=\"dialog\"]"] }]
      }
    ]
  }
]

=============== FILE: reports/pa11y.json ===============
{
  "total": 3,
  "results": {
    "/checkout": [
      {
        "code": "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
        "type": "error",
        "typeCode": 1,
        "message": "This element has insufficient contrast at this conformance level.",
        "context": "<button class=\"primary\">Place order</button>",
        "selector": "button.primary",
        "runner": "htmlcs"
      },
      {
        "code": "WCAG2A.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId",
        "type": "error",
        "typeCode": 1,
        "message": "Anchor element found with no link content and no name and/or ID attribute.",
        "context": "<a class=\"icon-cart\" href=\"/cart\">",
        "selector": "a.icon-cart",
        "runner": "htmlcs"
      }
    ],
    "/pricing": [
      {
        "code": "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
        "type": "error",
        "typeCode": 1,
        "message": "This element has insufficient contrast at this conformance level.",
        "context": "<span class=\"per-seat\">per seat / month</span>",
        "selector": "span.per-seat",
        "runner": "htmlcs"
      }
    ]
  }
}

=============== FILE: reports/lighthouse.json ===============
[
  {
    "requestedUrl": "/checkout",
    "categories": { "accessibility": { "id": "accessibility", "score": 0.74 } },
    "audits": {
      "color-contrast": {
        "id": "color-contrast",
        "title": "Background and foreground colors have a sufficient contrast ratio",
        "score": 0,
        "scoreDisplayMode": "binary",
        "details": {
          "type": "table",
          "items": [
            { "node": { "type": "node", "selector": "button.primary", "snippet": "<button class=\"primary\">" } },
            { "node": { "type": "node", "selector": "span.tax-note", "snippet": "<span class=\"tax-note\">" } }
          ]
        }
      },
      "link-name": {
        "id": "link-name",
        "title": "Links have a discernible name",
        "score": 0,
        "scoreDisplayMode": "binary",
        "details": {
          "type": "table",
          "items": [
            { "node": { "type": "node", "selector": "a.icon-cart", "snippet": "<a class=\"icon-cart\">" } }
          ]
        }
      },
      "image-alt": {
        "id": "image-alt",
        "title": "Image elements have [alt] attributes",
        "score": 1,
        "scoreDisplayMode": "binary",
        "details": { "type": "table", "items": [] }
      },
      "video-caption": {
        "id": "video-caption",
        "title": "<video> elements contain a <track> element with [kind=\"captions\"]",
        "score": null,
        "scoreDisplayMode": "notApplicable"
      },
      "focus-traps": {
        "id": "focus-traps",
        "title": "The page has no focus traps",
        "score": null,
        "scoreDisplayMode": "manual"
      }
    }
  },
  {
    "requestedUrl": "/pricing",
    "categories": { "accessibility": { "id": "accessibility", "score": 0.81 } },
    "audits": {
      "color-contrast": {
        "id": "color-contrast",
        "title": "Background and foreground colors have a sufficient contrast ratio",
        "score": 0,
        "scoreDisplayMode": "binary",
        "details": {
          "type": "table",
          "items": [
            { "node": { "type": "node", "selector": "a.footer-legal", "snippet": "<a class=\"footer-legal\">" } },
            { "node": { "type": "node", "selector": "span.per-seat", "snippet": "<span class=\"per-seat\">" } }
          ]
        }
      },
      "heading-order": {
        "id": "heading-order",
        "title": "Heading elements appear in a sequentially-descending order",
        "score": 1,
        "scoreDisplayMode": "binary",
        "details": { "type": "table", "items": [] }
      }
    }
  }
]

=============== FILE: reports/gate-output-today.md ===============
# What CI printed on #812, run 2026-09-12

```
merged 8 findings
# A11y check - verdict: NO-GO
blockers=8 warnings=0 grandfathered=0 fixed=4
BLOCK axe color-contrast /checkout button.primary
BLOCK axe color-contrast /checkout a.footer-legal
BLOCK axe color-contrast /checkout span.tax-note
BLOCK axe link-name /checkout a.icon-cart
BLOCK axe color-contrast /pricing span.per-seat
BLOCK axe aria-required-attr /pricing div[role="dialog"]
BLOCK lighthouse video-caption /checkout undefined
BLOCK lighthouse focus-traps /checkout undefined
FIXED wave::contrast::/checkout::button.primary
FIXED wave::contrast::/checkout::a.footer-legal
FIXED wave::link_empty::/checkout::a.icon-cart
FIXED wave::contrast::/pricing::span.per-seat
```

PR #812 (Ravi): adds the estimated-tax line to the checkout summary and a
"compare plans" dialog to the pricing page. Nothing else on either page was
touched. The pricing page footer has not been edited since March.
