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
