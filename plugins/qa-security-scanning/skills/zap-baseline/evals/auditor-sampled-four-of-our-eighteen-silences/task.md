# Auditor picked four lines out of our silence list and asked who signed them off

## Problem Description

We are Veridian Pay. Our SOC 2 Type II surveillance review is on 28 September and
the auditor did a walkthrough of the DAST control on Tuesday. She opened
`.zap/rules.tsv` — the file that tells the scanner which alerts not to fail the
pull-request check on — picked four lines out of it at random, and asked, for
each one: who approved this, when, and when does it stop being suppressed.

I could not answer any of the four. The file has eighteen lines, some of them
have a name or a ticket in a trailing comment, and none of them has an end date.
Her working note says the control is "operating as designed pending evidence of
approval and periodic review", which our compliance lead tells me is the polite
version of a finding.

So I need the file cleaned up before the 28th, and I need something written down
that I can hand her.

Two other things you should know, because I only found them while pulling the
evidence together.

The check has been green on every single pull request since 12 May. That struck
me as too good, so I pulled the run log — it is attached. On 30 July the report
for PR #2291 contained an alert that is not in the suppression file at all, about
a session cookie on the new checkout host, and the check still reported success
and the PR merged. Our pentest report from last month has that same cookie issue
against production, so it was real and it has been live ever since.

And the scanner's own options were changed on 12 May. The commit message says
"quieten DAST while we triage the backlog". I do not know what the option does
and the person who added it left in June.

Attached: the suppression file, the pull-request workflow, the run log, the
ticket board export for every ticket referenced in the file, and the small
format checker we run over the file in CI. The four lines the auditor sampled
are the ones for rules 10049, 40012, 10202 and 10035.

## Output Specification

1. `.zap/rules.tsv` — corrected.
2. `.github/workflows/dast-pr.yml` — corrected.
3. `docs/suppression-audit.md` — a per-entry disposition for all eighteen lines
   (kept, narrowed, or removed, and why), a direct answer to the four lines the
   auditor sampled, and whatever you conclude about the period since 12 May.
4. `node scripts/rules-audit.js .zap/rules.tsv` must exit 0 when you are done,
   and `npm test` must pass. Do not edit `reports/pr-run-log.md` or
   `reports/ticket-board.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "veridian-pay-ci",
  "version": "2.11.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: .zap/rules.tsv ===============
# Alerts the pull-request check does not fail on.
# One line per rule: id, action, url pattern. Comments after #.

10049	IGNORE	*	# cookie without HttpOnly - legacy session cookie, ops-2231
40012	IGNORE	*	# only ever fires on the old admin pages
10063	IGNORE	*
10096	IGNORE	*	# timestamp disclosure, noisy, agreed with dan
10038 IGNORE *	# content security policy missing on the marketing pages
10202	SKIP	*	# anti-csrf tokens, the framework handles this
90022	INFO	*
10035	IGNORE	https://app.veridianpay.dev/legacy/*	# strict transport security on the legacy host, ops-2184
10021	IGNORE	*	# x-frame-options, we set frame-ancestors instead
10027	IGNORE	*	# information disclosure in the build banner, ops-2307
10015	IGNORE	*	# cache-control on the docs pages
10017	IGNORE	*	# cross-domain script include, the analytics vendor
10098	IGNORE	*	# cross-domain misconfiguration, ops-2199
10109	IGNORE	*	# modern web application, informational
10023	IGNORE	*	# information disclosure via suspicious comments in the bundle
10055	IGNORE	*	# content security policy wildcard directive, ops-2312
10040	IGNORE	*	# secure pages include mixed content on /legacy/report
10054	IGNORE	https://app.veridianpay.dev/*	# cookie without SameSite, session cookie, ops-2231

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
      - name: Format-check the suppression file
        run: node scripts/rules-audit.js .zap/rules.tsv
      - uses: zaproxy/action-baseline@v0.13.0
        with:
          target: https://review-${{ github.event.number }}.veridianpay.dev
          rules_file_name: .zap/rules.tsv
          # 2026-05-12 quieten DAST while we triage the backlog
          cmd_options: '-J zap.json -I'
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: zap-report, path: zap.json }

=============== FILE: scripts/rules-audit.js ===============
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

=============== FILE: scripts/rules-audit.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { audit } = require('./rules-audit');

test('a well-formed entry with a trailing comment is accepted', () => {
  assert.deepEqual(audit('10049\tIGNORE\t*\t# legacy cookie, ops-2231'), []);
});

test('comment-only and blank lines are skipped', () => {
  assert.deepEqual(audit('# a note\n\n  \n'), []);
});

test('a space-separated entry is reported', () => {
  const problems = audit('10038 IGNORE *');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /tab-separated/);
});

test('an action the scanner does not understand is reported', () => {
  const problems = audit('10202\tSKIP\t*');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /unknown action/);
});

=============== FILE: reports/pr-run-log.md ===============
# DAST (pull request) — run log

Pulled from the Actions API on 2026-09-10. "New" means alerts in the report
whose rule id does not appear in `.zap/rules.tsv` at the time of the run.

| Date       | PR    | Alerts in report | New | Conclusion |
|------------|-------|------------------|-----|------------|
| 2026-05-08 | #2104 | 16               | 1   | failure    |
| 2026-05-11 | #2109 | 16               | 1   | failure    |
| 2026-05-12 | #2112 | 16               | 1   | success    |
| 2026-05-19 | #2130 | 16               | 0   | success    |
| 2026-06-02 | #2168 | 17               | 1   | success    |
| 2026-06-23 | #2201 | 17               | 1   | success    |
| 2026-07-14 | #2255 | 17               | 1   | success    |
| 2026-07-30 | #2291 | 18               | 2   | success    |
| 2026-08-18 | #2340 | 18               | 2   | success    |
| 2026-09-04 | #2388 | 18               | 2   | success    |
| 2026-09-09 | #2401 | 18               | 2   | success    |

Nothing has been added to `.zap/rules.tsv` since 2026-04-28.

The two "new" alerts on the recent runs are, from the PR #2401 report:

- rule 10054, `checkout.veridianpay.dev`, session cookie set without SameSite —
  this host is not covered by the 10054 line, which was written for the old
  app host pattern before checkout was split out.
- rule 90033, `checkout.veridianpay.dev`, an alert our notes call "loosely
  scoped permissions policy". First appeared 2026-07-30.

## Pentest, August 2026 (external, Ravensbourne Security)

Three findings against production. Two are ours to fix:

- **VP-2026-04 (medium)** — the checkout session cookie is set without
  `SameSite`, so it is attached to cross-site requests. Present on
  `checkout.veridianpay.dev` since the host was split out on 2026-07-28.
  Still live.
- **VP-2026-05 (low)** — permissions policy on checkout allows more than it
  needs. Still live.

=============== FILE: reports/ticket-board.md ===============
# Ticket board export — every ticket referenced in .zap/rules.tsv

| Ticket   | Title                                                | State  | Closed      |
|----------|------------------------------------------------------|--------|-------------|
| ops-2184 | Enable HSTS on the legacy host                       | Closed | 2026-03-04  |
| ops-2199 | Fix cross-domain configuration on the CDN origin     | Closed | 2026-03-19  |
| ops-2231 | Replace the legacy session cookie                    | Open   | —           |
| ops-2307 | Strip the build banner from production responses     | Open   | —           |
| ops-2312 | Tighten the wildcard in the content security policy  | Open   | —           |

Notes from the board:

- ops-2184 was closed by PR #1904, "legacy host now serves HSTS on every
  response". The legacy host still exists and still serves `/legacy/*`.
- ops-2199 was closed by PR #1958. Verified by the reporter at the time.
- ops-2231 has been open since 2025-11. Owner: platform (lead @dstokes).
- ops-2307 owner: platform (lead @dstokes).
- ops-2312 owner: web (lead @mira.k).
- The old admin pages referenced in the 40012 comment are served from
  `https://app.veridianpay.dev/admin/legacy/*` only. Everything else on
  `app.veridianpay.dev`, including the whole customer-facing product and the
  new checkout host, is current code.
