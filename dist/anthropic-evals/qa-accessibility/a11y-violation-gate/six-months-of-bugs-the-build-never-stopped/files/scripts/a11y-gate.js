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
