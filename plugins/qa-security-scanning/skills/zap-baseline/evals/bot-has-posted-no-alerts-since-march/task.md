# Our scanner bot says "0 alerts" on every PR and a pentest just found three

## Problem Description

Kepler Labs. We ship `atlas.kepler-labs.com`, and every pull request gets a
review deployment at `pr-<number>.atlas-review.dev`. Since March a workflow has
scanned that review deployment and a bot has left a comment on the PR with what
it found. The comment has said "ZAP: 0 alerts. Nothing to review." on all 611
pull requests since it was switched on. Nobody has thought about it in months.

Last week an external firm ran a pentest against production and came back with
three findings. Two of them are header configuration and one is a cookie
attribute. Their report is attached, along with the raw job log from a recent
run and the script the bot uses.

This is the only automated security scanning we do. There is no nightly job and
no scheduled scan of anything. Three people have now told me what to do about
it and I do not want to pick between them on vibes.

**Jools**, our engineering manager, wants the workflow deleted. Her position:
611 pull requests and it has never once told us anything, we are paying for
runner minutes to generate a comment everyone scrolls past, and the pentest
proves it does not work. She is not wrong about the track record.

**Sam**, who joined in June, wants to replace it with the deep scan — the one
that actually submits forms and throws payloads — on every pull request. His
argument is that the crawl we run is passive, passive is clearly too weak to
find anything, and the pentest is the proof. He has anticipated the obvious
objection: a review deployment is created from scratch for each PR, has its own
isolated database seeded from a fixtures file, sends no mail anywhere, talks to
no third party, and is destroyed when the PR merges or closes. So there is
nothing on it to damage. His draft is attached; it takes 19 minutes against the
2 minutes we run today, and he has it going green on his own branch.

**Fenna**, our tech lead, wants the check switched from advisory to blocking
this week, on the grounds that a scanner nobody is obliged to read is
decoration.

I want your read on all three, and I want the thing fixed rather than argued
about. One constraint from me: whatever you do, a hundred PRs cannot all go red
tomorrow morning because of problems that were already there on Monday. We have
a release on the 22nd.

## Output Specification

1. `docs/dast-bot-review.md` — what actually happened, your answer to each of
   Jools, Sam and Fenna, and how the findings that already exist are handled so
   that the release on the 22nd is not blocked by them.
2. `.github/workflows/dast-pr.yml` — corrected.
3. `scripts/post-findings.js` — corrected, with tests for whatever you changed.
4. `npm test` must pass and the tests already present must not be weakened.
5. Do not edit `reports/pentest-2026-09.md` or `reports/run-4821.md`.

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

=============== FILE: .github/workflows/dast-pr.sam-draft.yml ===============
# Drafted by Sam 2026-09-10. Not merged. 19m on my branch, green.
name: DAST (pull request)

on:
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - uses: actions/checkout@v5
      - name: Wait for the review deployment
        run: ./ci/wait-for-review-deploy.sh
      - name: Scan
        run: |
          docker run --rm -v $(pwd):/zap/wrk/:rw \
            ghcr.io/zaproxy/zaproxy:stable \
            zap-full-scan.py \
              -t https://pr-${{ github.event.number }}.atlas-review.dev \
              -j -m 20 \
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

Job conclusion: success (1m 52s). Raw step log, trimmed at both ends.

```
Wait for the review deployment
  https://pr-3390.atlas-review.dev ready after 41s

Scan
  Total of 62 URLs
  PASS: Vulnerable JS Library [10003]
  PASS: Cookie Slack Detector [90027]
  WARN-NEW: Content Security Policy (CSP) Header Not Set [10038] x 6
  WARN-NEW: Cookie No HttpOnly Flag [10049] x 2
  WARN-NEW: Permissions Policy Header Not Set [10063] x 6
  FAIL-NEW: 0  FAIL-INPROG: 0  WARN-NEW: 14  WARN-INPROG: 0  IGNORE: 0  PASS: 51
  Report written to /zap/wrk/zap-report.html

Comment on the pull request
  ZAP: 0 alerts. Nothing to review.

Upload artifact
  Uploaded zap-report.html (241 kB)
```

Artifact listing for the last ten runs of this workflow, from the Actions API:

| Run  | PR    | Artifact name | Files in artifact | Size   |
|------|-------|---------------|-------------------|--------|
| 4821 | #3390 | zap-report    | zap-report.html   | 241 kB |
| 4818 | #3388 | zap-report    | zap-report.html   | 238 kB |
| 4815 | #3387 | zap-report    | zap-report.html   | 244 kB |
| 4809 | #3384 | zap-report    | zap-report.html   | 239 kB |
| 4801 | #3380 | zap-report    | zap-report.html   | 241 kB |

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
observations, not anything we had to work for. We would ordinarily expect a team
running a scanner in CI to have seen these before we arrived, and we asked
whether you were; we were told the scanner reports nothing."
