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
