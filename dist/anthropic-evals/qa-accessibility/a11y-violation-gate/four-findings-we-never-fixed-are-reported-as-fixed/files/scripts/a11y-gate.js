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
