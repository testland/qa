'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'a11y-check.config.json'), 'utf8'));
}

function loadRun(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function counted(config, ruleId) {
  const r = config && config.rules && config.rules[ruleId];
  return !r || r.count !== false;
}

function countViolations(run, config) {
  let total = 0;
  for (const page of run) {
    for (const v of page.violations) {
      if (!counted(config, v.id)) continue;
      total += v.nodes.length;
    }
  }
  return total;
}

function countByRule(run, config) {
  const out = {};
  for (const page of run) {
    for (const v of page.violations) {
      if (!counted(config, v.id)) continue;
      out[v.id] = (out[v.id] || 0) + v.nodes.length;
    }
  }
  return out;
}

function gate(counts, run, config) {
  const current = countViolations(run, config);
  if (!counts) {
    return {
      verdict: config.onMissingArtifact === 'fail' ? 'no-go' : 'go',
      previous: null,
      current,
    };
  }
  return { verdict: current > counts.total ? 'no-go' : 'go', previous: counts.total, current };
}

if (require.main === module) {
  const config = loadConfig();
  const artifact = path.join(ROOT, 'a11y-counts.json');
  const counts = fs.existsSync(artifact) ? JSON.parse(fs.readFileSync(artifact, 'utf8')) : null;
  const result = gate(counts, loadRun(process.argv[2] || 'reports/pr-4471-scan.json'), config);
  console.log('# A11y check - verdict: ' + result.verdict.toUpperCase());
  console.log('previous=' + result.previous + ' current=' + result.current);
  process.exit(result.verdict === 'go' ? 0 : 1);
}

module.exports = { loadConfig, loadRun, counted, countViolations, countByRule, gate };
