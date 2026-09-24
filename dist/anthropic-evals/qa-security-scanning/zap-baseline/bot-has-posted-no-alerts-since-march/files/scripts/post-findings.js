'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const BLOCKING = new Set(['High', 'Medium']);

function collect(reportFile) {
  const full = path.join(ROOT, reportFile);
  if (!fs.existsSync(full)) return [];
  const report = JSON.parse(fs.readFileSync(full, 'utf8'));
  const out = [];
  for (const site of report.site || []) {
    for (const alert of site.alerts || []) {
      out.push({
        rule_id: alert.pluginid,
        name: alert.name,
        risk: alert.riskdesc.split(' ')[0],
        url: (alert.instances && alert.instances[0] && alert.instances[0].uri) || site['@name'],
      });
    }
  }
  return out;
}

function comment(alerts) {
  if (!alerts.length) return 'ZAP: 0 alerts. Nothing to review.';
  const lines = ['ZAP: ' + alerts.length + ' alert(s).', ''];
  for (const a of alerts) lines.push('- [' + a.risk + '] ' + a.name + ' (' + a.rule_id + ') ' + a.url);
  return lines.join('\n');
}

if (require.main === module) {
  const alerts = collect(process.argv[2] || 'zap-report.json');
  console.log(comment(alerts));
  const blocking = alerts.filter((a) => BLOCKING.has(a.risk));
  process.exit(blocking.length ? 1 : 0);
}

module.exports = { collect, comment, BLOCKING };
