'use strict';

const fs = require('node:fs');

const ACTIONS = new Set(['INFO', 'WARN', 'IGNORE', 'FAIL']);

function audit(text) {
  const problems = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const body = line.split('#')[0].replace(/\s+$/, '');
    if (!body.trim()) return;
    const n = index + 1;
    const cells = body.split('\t');
    if (cells.length !== 3) {
      problems.push('line ' + n + ': expected 3 tab-separated columns, found ' + cells.length);
      return;
    }
    if (!/^\d+$/.test(cells[0])) problems.push('line ' + n + ': rule id is not numeric: ' + cells[0]);
    if (!ACTIONS.has(cells[1])) problems.push('line ' + n + ': unknown action: ' + cells[1]);
    if (!cells[2]) problems.push('line ' + n + ': empty url pattern');
  });
  return problems;
}

if (require.main === module) {
  const file = process.argv[2] || '.zap/rules.tsv';
  const problems = audit(fs.readFileSync(file, 'utf8'));
  for (const p of problems) console.log(p);
  console.log(problems.length + ' format problem(s) in ' + file);
  process.exit(problems.length ? 1 : 0);
}

module.exports = { audit, ACTIONS };
