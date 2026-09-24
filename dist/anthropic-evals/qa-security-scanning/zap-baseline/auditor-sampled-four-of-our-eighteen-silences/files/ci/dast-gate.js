'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ACTIONS = new Set(['INFO', 'WARN', 'IGNORE', 'FAIL']);

function parseRules(text) {
  const rules = [];
  const problems = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const body = line.split('#')[0].replace(/\s+$/, '');
    if (!body.trim()) return;
    const cells = body.split('\t');
    if (cells.length !== 3) {
      problems.push('line ' + (i + 1) + ': expected 3 tab-separated columns, found ' + cells.length);
      return;
    }
    if (!/^\d+$/.test(cells[0])) problems.push('line ' + (i + 1) + ': rule id is not numeric: ' + cells[0]);
    if (!ACTIONS.has(cells[1])) problems.push('line ' + (i + 1) + ': unknown action: ' + cells[1]);
    rules.push({ id: cells[0], action: cells[1], pattern: cells[2] });
  });
  return { rules, problems };
}

function actionFor(finding, rules) {
  const prefix = (p) => (p === '*' ? '' : p.replace(/\*$/, ''));
  const match = rules.find((r) => r.id === finding.rule_id && String(finding.url).startsWith(prefix(r.pattern)));
  return match ? match.action : 'FAIL';
}

function blocking(findings, rules) {
  return findings.filter((f) => actionFor(f, rules) === 'FAIL');
}

function flatten(report) {
  const out = [];
  for (const site of report.site || []) {
    for (const alert of site.alerts || []) {
      const uris = (alert.instances || []).map((i) => i.uri);
      for (const uri of uris.length ? uris : [site['@name']]) {
        out.push({ rule_id: alert.pluginid, name: alert.name, url: uri });
      }
    }
  }
  return out;
}

const keyOf = (f) => f.rule_id + ' ' + f.url;

function unaccepted(findings, accepted) {
  const known = new Set(accepted.map(keyOf));
  return findings.filter((f) => !known.has(keyOf(f)));
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const accept = argv[0] === '--accept';
  const rest = accept ? argv.slice(1) : argv;
  const reportFile = rest[0] || 'zap.json';
  const acceptedFile = rest[1] || '.zap/baseline-findings.json';

  const { rules, problems } = parseRules(fs.readFileSync(path.join(ROOT, '.zap/rules.tsv'), 'utf8'));
  for (const p of problems) console.log('rules.tsv ' + p);

  const report = JSON.parse(fs.readFileSync(path.join(ROOT, reportFile), 'utf8'));
  const found = blocking(flatten(report), rules);

  if (accept) {
    fs.writeFileSync(path.join(ROOT, acceptedFile), JSON.stringify(found, null, 2) + '\n');
    console.log('accepted ' + found.length + ' finding(s) into ' + acceptedFile);
    process.exit(0);
  }

  const accepted = JSON.parse(fs.readFileSync(path.join(ROOT, acceptedFile), 'utf8'));
  const fresh = unaccepted(found, accepted);
  for (const f of fresh) console.log('NEW ' + f.rule_id + ' ' + f.url);
  console.log(fresh.length + ' finding(s) not on the accepted list');
  process.exit(fresh.length ? 1 : 0);
}

module.exports = { ACTIONS, parseRules, actionFor, blocking, flatten, unaccepted };
