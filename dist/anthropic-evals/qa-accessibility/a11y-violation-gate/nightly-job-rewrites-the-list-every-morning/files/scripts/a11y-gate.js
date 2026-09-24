'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BLOCK = new Set(['critical', 'serious']);

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
  const result = evaluate(readRecords(process.argv[2] || 'reports/latest-scan.json'), known);
  console.log('blockers=' + result.blockers.length + ' warnings=' + result.warnings.length +
    ' grandfathered=' + result.grandfathered + ' fixed=' + result.fixed.length);
  for (const b of result.blockers) console.log('- ' + b.rule_id + ' on ' + b.page_url + ' (' + b.selector + ')');
  process.exit(result.blockers.length ? 1 : 0);
}

module.exports = { fingerprint, readRecords, evaluate };
