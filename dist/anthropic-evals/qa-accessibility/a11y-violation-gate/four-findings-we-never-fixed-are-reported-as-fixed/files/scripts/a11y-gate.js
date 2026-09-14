'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const CANONICAL = {
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
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/axe-812.json'), 'utf8'));
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
          html: node.html,
          severity: v.impact,
        });
      }
    }
  }
  return stamp(out);
}

function readPa11y() {
  const run = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/pa11y-812.json'), 'utf8'));
  const out = [];
  for (const [url, issues] of Object.entries(run.results)) {
    for (const issue of issues) {
      out.push({
        scanner: 'pa11y',
        rule_id: issue.code,
        wcag_sc: issue.code.split('.').slice(1, 4).join('.'),
        page_url: url,
        selector: issue.selector,
        html: issue.context,
        severity: issue.type === 'error' ? 'serious' : 'moderate',
      });
    }
  }
  return stamp(out);
}

function collect() {
  return [...readAxe(), ...readPa11y()];
}

function classify(records, known, config) {
  const baseline = new Set(known);
  const seen = new Set(records.map((r) => r.fingerprint));
  const fresh = records.filter((r) => !baseline.has(r.fingerprint));
  const blockOn = new Set(config.blockOn);
  const warnOn = new Set(config.warnOn);
  return {
    blockers: fresh.filter((r) => blockOn.has(r.severity)),
    warnings: fresh.filter((r) => warnOn.has(r.severity)),
    grandfathered: records.length - fresh.length,
    fixed: [...baseline].filter((f) => !seen.has(f)),
  };
}

if (require.main === module) {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'a11y-gate.config.json'), 'utf8'));
  const known = JSON.parse(fs.readFileSync(path.join(ROOT, config.baseline), 'utf8')).violations;
  const result = classify(collect(), known, config);
  const verdict = result.blockers.length ? 'no-go' : 'go';
  console.log('# A11y check - verdict: ' + verdict.toUpperCase());
  console.log('blockers=' + result.blockers.length + ' warnings=' + result.warnings.length +
    ' grandfathered=' + result.grandfathered + ' fixed=' + result.fixed.length);
  for (const b of result.blockers) console.log('BLOCK ' + b.scanner + ' ' + canonical(b.rule_id) + ' ' + b.page_url + ' ' + b.selector);
  for (const f of result.fixed) console.log('FIXED ' + f);
  process.exit(verdict === 'go' ? 0 : 1);
}

module.exports = { canonical, fingerprint, readAxe, readPa11y, collect, classify };
