'use strict';

const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

function loadResults(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('-result.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

function tally(results) {
  const counts = { passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0 };
  for (const r of results) {
    const key = Object.prototype.hasOwnProperty.call(counts, r.status) ? r.status : 'unknown';
    counts[key] += 1;
  }
  return counts;
}

function renderReleaseNotes({ version, results, buildUrl, coverage }) {
  const c = tally(results);
  return [
    `## QA - ${version}`,
    '',
    `- **Test results:** ${c.passed} / ${results.length} tests passed, ${c.failed} failures, ${c.skipped} skipped. Full report: ${buildUrl || 'TBD'}.`,
    `- **Coverage:** ${coverage || 'n/a'}.`,
    '',
  ].join('\n');
}

module.exports = { loadResults, tally, renderReleaseNotes };
