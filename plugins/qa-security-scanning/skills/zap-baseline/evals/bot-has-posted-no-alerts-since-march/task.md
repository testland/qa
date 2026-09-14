# Our scanner bot says "0 alerts" on every PR and a pentest just found three

## Problem Description

Kepler Labs. We ship `atlas.kepler-labs.com`, and every pull request gets a
review deployment at `pr-<number>.atlas-review.dev`. Since March a workflow has
scanned that review deployment and a bot has left a comment on the PR with what
it found. The comment has said "ZAP: 0 alerts. Nothing to review." on all 611
pull requests since it was switched on. Nobody has thought about it in months.

Last week an external firm ran a pentest against production and came back with
three findings. Two of them are header configuration and one is a cookie
attribute. I have attached their report. When I mentioned it in standup, our
tech lead Fenna said that is exactly the sort of thing a passive scan reports,
and pulled the artifacts from a recent run. The run log is attached. So is the
report the run produced, which I am told is the same one the bot read.

Two proposals came out of that conversation and I do not want to pick between
them on vibes.

- Our engineering manager, Jools, wants the workflow deleted. Her position:
  611 pull requests and it has never once told us anything, we are paying for
  runner minutes to generate a comment everyone scrolls past, and the pentest
  proves it does not work. She is not wrong about the track record.
- A newer engineer, Sam, wants to keep it and have the bot read the report file
  we already produce, pulling the alert rows out of it with a regular expression
  so the comment finally has something in it. He has a proof of concept that
  works on last night's file.

I want your read on both, and I want the thing fixed rather than argued about.
One more constraint from me: whatever you do, a hundred PRs cannot all go red
tomorrow morning because of problems that were already there on Monday. We have
a release on the 22nd.

## Output Specification

1. `docs/dast-bot-review.md` — what actually happened, your answer to Jools and
   to Sam, and how the findings that already exist are handled so that the
   release on the 22nd is not blocked by them.
2. `.github/workflows/dast-pr.yml` — corrected.
3. `scripts/post-findings.js` — corrected, with tests for whatever you changed.
4. `npm test` must pass and the tests already present must not be weakened.
5. Do not edit `reports/pentest-2026-09.md`, `reports/run-4821.md` or
   `reports/zap-report-excerpt.html`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "atlas-ci",
  "version": "12.6.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: .github/workflows/dast-pr.yml ===============
name: DAST (pull request)

on:
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Wait for the review deployment
        run: ./ci/wait-for-review-deploy.sh
      - name: Scan
        run: |
          docker run --rm -v $(pwd):/zap/wrk/:rw \
            ghcr.io/zaproxy/zaproxy:stable \
            zap-baseline.py \
              -t https://pr-${{ github.event.number }}.atlas-review.dev \
              -r zap-report.html
      - name: Comment on the pull request
        run: node scripts/post-findings.js zap-report.json
      - uses: actions/upload-artifact@v4
        with: { name: zap-report, path: zap-report.html }

=============== FILE: scripts/post-findings.js ===============
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

=============== FILE: scripts/post-findings.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collect, comment } = require('./post-findings');

test('alerts are flattened out of the report', () => {
  const alerts = collect('fixtures/sample-report.json');
  assert.equal(alerts.length, 2);
  assert.deepEqual(alerts.map((a) => a.rule_id), ['10049', '10063']);
  assert.equal(alerts[0].risk, 'Low');
  assert.equal(alerts[1].url, 'https://pr-1.atlas-review.dev/');
});

test('the comment lists every alert it was given', () => {
  const body = comment([
    { rule_id: '10038', name: 'Content Security Policy Header Not Set', risk: 'Medium', url: '/' },
  ]);
  assert.match(body, /1 alert/);
  assert.match(body, /10038/);
});

test('an empty list produces the nothing-to-review comment', () => {
  assert.match(comment([]), /Nothing to review/);
});

=============== FILE: fixtures/sample-report.json ===============
{
  "site": [
    {
      "@name": "https://pr-1.atlas-review.dev",
      "alerts": [
        {
          "pluginid": "10049",
          "name": "Cookie No HttpOnly Flag",
          "riskdesc": "Low (Medium)",
          "instances": [{ "uri": "https://pr-1.atlas-review.dev/app" }]
        },
        {
          "pluginid": "10063",
          "name": "Permissions Policy Header Not Set",
          "riskdesc": "Low (Medium)",
          "instances": [{ "uri": "https://pr-1.atlas-review.dev/" }]
        }
      ]
    }
  ]
}

=============== FILE: reports/run-4821.md ===============
# Run 4821 — DAST (pull request), PR #3390, 2026-09-08

Job conclusion: success (1m 52s).

Step log, trimmed:

```
Scan
  ...
  PASS: Vulnerable JS Library [10003]
  WARN-NEW: Content Security Policy (CSP) Header Not Set [10038] x 6
  WARN-NEW: Cookie No HttpOnly Flag [10049] x 2
  WARN-NEW: Permissions Policy Header Not Set [10063] x 6
  ...
  FAIL-NEW: 0  FAIL-INPROG: 0  WARN-NEW: 14  WARN-INPROG: 0  IGNORE: 0  PASS: 51
  Report written to /zap/wrk/zap-report.html

Comment on the pull request
  ZAP: 0 alerts. Nothing to review.

Upload artifact
  Uploaded zap-report.html (241 kB)
```

Files present in the workspace after the scan step, from a debug run we did on
2026-09-09:

```
$ ls -1
ci/
docs/
fixtures/
package.json
scripts/
zap-report.html
```

=============== FILE: reports/zap-report-excerpt.html ===============
<!-- First 40 lines of zap-report.html from run 4821. -->
<html>
<head><title>ZAP Scanning Report</title></head>
<body>
<h2>Summary of Alerts</h2>
<table width="45%" border="0">
<tr bgcolor="#666666"><th width="45%">Risk Level</th><th width="55%">Number of Alerts</th></tr>
<tr bgcolor="#e8e8e8"><td>High</td><td>0</td></tr>
<tr bgcolor="#e8e8e8"><td>Medium</td><td>0</td></tr>
<tr bgcolor="#e8e8e8"><td>Low</td><td>10</td></tr>
<tr bgcolor="#e8e8e8"><td>Informational</td><td>4</td></tr>
</table>
<h2>Alert Detail</h2>
<table width="100%" border="0">
<tr height="24" class="risk-low">
<th width="20%"><a name="10038"></a>Low</th>
<th width="80%">Content Security Policy (CSP) Header Not Set</th></tr>
<tr bgcolor="#e8e8e8"><td width="20%">Description</td>
<td width="80%"><p>Content Security Policy (CSP) is an added layer of security...</p></td></tr>
<tr bgcolor="#e8e8e8"><td width="20%">URL</td>
<td width="80%"><a href="https://pr-3390.atlas-review.dev/">https://pr-3390.atlas-review.dev/</a></td></tr>
<tr bgcolor="#e8e8e8"><td width="20%">Instances</td><td width="80%">6</td></tr>
<tr height="24" class="risk-low">
<th width="20%"><a name="10049"></a>Low</th>
<th width="80%">Cookie No HttpOnly Flag</th></tr>
<tr bgcolor="#e8e8e8"><td width="20%">URL</td>
<td width="80%"><a href="https://pr-3390.atlas-review.dev/app">https://pr-3390.atlas-review.dev/app</a></td></tr>
<tr bgcolor="#e8e8e8"><td width="20%">Instances</td><td width="80%">2</td></tr>
<tr height="24" class="risk-low">
<th width="20%"><a name="10063"></a>Low</th>
<th width="80%">Permissions Policy Header Not Set</th></tr>
<tr bgcolor="#e8e8e8"><td width="20%">URL</td>
<td width="80%"><a href="https://pr-3390.atlas-review.dev/">https://pr-3390.atlas-review.dev/</a></td></tr>
<tr bgcolor="#e8e8e8"><td width="20%">Instances</td><td width="80%">6</td></tr>
</table>
</body>
</html>

=============== FILE: reports/pentest-2026-09.md ===============
# Pentest — Solberg & Ness, September 2026

Scope: atlas.kepler-labs.com, production, 2026-09-01 to 2026-09-04.

## Findings

**KL-01 (medium) — No Content-Security-Policy on any application response.**
Every response from the app origin is served without a CSP header. Present on
all pages tested.

**KL-02 (medium) — Session cookie `atlas_sid` set without HttpOnly.**
The session cookie is readable from JavaScript on `/app` and everything under
it. Reachable by any script that lands on the page.

**KL-03 (low) — No Permissions-Policy header.**
Not set on any response.

## Note from the engagement lead

"All three of these are visible from an unauthenticated request to the front
page or the app shell — they are response-header and cookie-attribute
observations, not anything we had to work for. Any passive web scanner that
looks at a response will list them. We would ordinarily expect a team running
one in CI to have seen these before we arrived, and we asked whether you were;
we were told the scanner reports nothing."
