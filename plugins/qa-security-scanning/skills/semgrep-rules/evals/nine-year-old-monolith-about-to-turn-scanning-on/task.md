# Flipping the monolith's shadow check to blocking, after it missed one

## Problem Description

`atlas-core` is nine years old, 340k lines of JavaScript, 22 engineers, and had
no static analysis in the pipeline until last month. That changed after
2026-08-22, when a session cookie set without the `secure` attribute let an
internal support tool read a customer session — INC-2291, writeup attached. Our
VP committed to the board that scanning is enforced on pull requests by
2026-10-01. That date is not moving.

Since 2026-09-01 the check has run on every PR in shadow mode: it reports, it
does not block. Marta built it. The plan was to flip it to blocking on the first
of October and treat the three shadow weeks as the rehearsal.

Then PR #4530 landed on 2026-09-08. It added a session cookie to the support
module without the `secure` attribute — the same shape of thing as August. The
shadow check on that PR was green. I have attached its job log, the log from
#4519 where the check did report something, both workflow files, and last
night's full-tree report.

Marta and Dev have each read the #4530 log and come away with a different
diagnosis, and they are both senior enough that I cannot just pick one. The
thread is `docs/rollout-thread.md`. What I need is the plan I put in front of
the VP on Monday and the workflow file that implements it, and I need it to be
the thing we actually switch on, not a compromise between two people.

Assume engineers open PRs against `main` the same afternoon it goes live.

Do not fix application code in this task. If something in the tree has to be
dealt with before the switch-over, say so in the plan and I will assign it.

`npm test` is green today and must stay green.

## Output Specification

1. Rewrite `.github/workflows/sast.yml` into the blocking pull-request check we
   go live with on 2026-10-01, including the exact command line.
2. Write `docs/sast-rollout.md`: why the check on #4530 was green, what blocks a
   PR and what does not once this ships, what happens to the findings already in
   the tree, anything that must be handled before the switch-over, and the
   mechanism and cadence for working the backlog down. Answer Marta's diagnosis
   and Dev's diagnosis directly and by name — both of them will read it.
3. Do not modify application code or tests.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/rollout-thread.md ===============
# #eng-platform — 2026-09-10

**marta.reinholt** (staff, built the gate) — I have gone through #4530 and I
think the rulesets are the problem. `p/javascript` and `p/owasp-top-ten` are
community packs; they clearly do not carry whatever rule would have caught a
cookie attribute. Switch the config over to registry auto-detection so we pick
up everything the registry has for this repo instead of guessing which pack
holds what. Three weeks of shadow running produced four findings in total,
which tells me the plumbing is right and the rule coverage is not.

**dev.chaudhary** — I read it the other way round. The gate only looks at what
the branch changed against a baseline, and that is exactly how something walks
through: the support module has been edited twenty-odd times since the baseline
was cut. Drop the baseline, scan the whole tree on every PR, take the pain for a
fortnight. We have a board commitment, not a comfort commitment.

**marta.reinholt** — 1,853 findings on every pull request and the check is
switched off by Friday. I have watched that happen at two companies. If we are
not dropping the baseline then at minimum take `src/legacy/` out of the scan —
1,504 of those findings are in a tree nobody is allowed to refactor anyway.

**t.okonkwo** — Whichever of you is right, it has to be written down and in
front of the VP on Monday, and blocking on the first.

=============== FILE: docs/incident-2026-08-22.md ===============
# INC-2291 — support tool could read a customer session

**Severity:** SEV-2. **Detected:** 2026-08-22 09:14 UTC by a customer report.
**Contained:** 2026-08-22 17:40 UTC.

## What happened

`src/legacy/session/cookies.js` set the session cookie without the `secure`
attribute. On the support subdomain, served over plain HTTP internally since a
2019 proxy change, the cookie went across the internal network in clear text and
a support tool logged it. 41 customer sessions affected. No evidence of external
exposure.

## Action items

- AI-1: `src/legacy/session/cookies.js` fixed and shipped 2026-08-22 (#4468).
- AI-2: enforce static analysis on pull requests by 2026-10-01. **This item.**
- AI-3: audit the remaining occurrences of the same shape. Not started.

=============== FILE: .github/workflows/sast.yml ===============
name: sast

on:
  pull_request:
    branches: [main]

jobs:
  shadow:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:1.99.0
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      # Shadow mode until 2026-10-01: reports, never blocks.
      - name: Static analysis
        continue-on-error: true
        run: |
          semgrep ci \
            --config p/owasp-top-ten \
            --config p/javascript \
            --severity ERROR \
            --baseline-ref origin/main \
            -j 4 \
            --metrics=off

=============== FILE: .github/workflows/sast-nightly.yml ===============
name: sast-nightly

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  full-scan:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:1.99.0
    steps:
      - uses: actions/checkout@v5

      - name: Full-tree scan
        continue-on-error: true
        run: |
          semgrep scan \
            --config p/owasp-top-ten \
            --config p/javascript \
            --json --output nightly.json \
            --metrics=off

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-json
          path: nightly.json

=============== FILE: logs/pr-4530-shadow.txt ===============
2026-09-08T11:04:12.3310Z ##[group]Run semgrep ci --config p/owasp-top-ten --config p/javascript --severity ERROR --baseline-ref origin/main -j 4 --metrics=off
2026-09-08T11:04:13.0102Z
2026-09-08T11:04:13.0103Z  ---- Semgrep CLI 1.99.0 ----
2026-09-08T11:04:13.7741Z Scanning 6 files tracked by git with 1042 rules.
2026-09-08T11:04:41.2210Z
2026-09-08T11:04:41.2211Z Ran 1042 rules on 6 files: 0 findings.
2026-09-08T11:04:44.8802Z ##[endgroup]
2026-09-08T11:04:45.0110Z Process completed with exit code 0.

=============== FILE: logs/pr-4519-shadow.txt ===============
2026-09-03T16:41:02.7710Z ##[group]Run semgrep ci --config p/owasp-top-ten --config p/javascript --severity ERROR --baseline-ref origin/main -j 4 --metrics=off
2026-09-03T16:41:03.4400Z
2026-09-03T16:41:03.4401Z  ---- Semgrep CLI 1.99.0 ----
2026-09-03T16:41:04.1190Z Scanning 11 files tracked by git with 1042 rules.
2026-09-03T16:41:38.6620Z
2026-09-03T16:41:38.6621Z Findings:
2026-09-03T16:41:38.6622Z
2026-09-03T16:41:38.6630Z   src/api/auth/dev-token.js
2026-09-03T16:41:38.6631Z      javascript.jwt.security.jwt-hardcode.hardcoded-jwt-secret
2026-09-03T16:41:38.6632Z         Hardcoded JWT secret detected.
2026-09-03T16:41:38.6633Z         Severity: ERROR
2026-09-03T16:41:38.6634Z          12|   const DEV_SECRET = "dev-secret-do-not-ship";
2026-09-03T16:41:38.6640Z
2026-09-03T16:41:38.6641Z Ran 1042 rules on 11 files: 1 finding.
2026-09-03T16:41:41.0020Z ##[endgroup]
2026-09-03T16:41:41.2214Z Process completed with exit code 1.

=============== FILE: reports/nightly-2026-09-09.md ===============
# Nightly full-tree scan — atlas-core @ 3a91f0d — 2026-09-09 03:00 UTC

Command as run: see `.github/workflows/sast-nightly.yml`.
Duration: 6m 41s. Files scanned: 2,914. Rules: 1,042.

## By severity

| Severity | Findings |
|---|---|
| ERROR   | 214   |
| WARNING | 1,341 |
| INFO    | 298   |
| **Total** | **1,853** |

## By directory

| Path | ERROR | WARNING | INFO | Total |
|---|---|---|---|---|
| src/legacy/    | 168 | 1,109 | 227 | 1,504 |
| src/billing/   | 21  | 94    | 31  | 146   |
| src/api/       | 16  | 82    | 23  | 121   |
| src/web/       | 6   | 41    | 14  | 61    |
| scripts/       | 3   | 15    | 3   | 21    |

## Top rules by count

| Rule | Severity | Count |
|---|---|---|
| javascript.lang.security.audit.path-traversal.path-join-resolve-traversal | WARNING | 143 |
| javascript.express.security.audit.express-open-redirect | WARNING | 88 |
| javascript.express.security.audit.express-cookie-session-no-secure | WARNING | 62 |
| javascript.lang.best-practice.leftover-debugging | INFO | 211 |
| javascript.lang.security.audit.sqli.node-postgres-sqli | ERROR | 9 |

## express-cookie-session-no-secure — sample, with first-seen commit dates

| Path | Line | First seen |
|---|---|---|
| src/api/support/session.js | 26 | 2026-09-08 (#4530) |
| src/legacy/billing/portal.js | 212 | 2019-06-11 |
| src/legacy/session/legacy-store.js | 77 | 2018-02-20 |

54 of the 62 sit under `src/legacy/`.

## ERROR findings whose first-seen date is after 2026-08-21

| Rule | Path | First seen |
|---|---|---|
| javascript.lang.security.audit.sqli.node-postgres-sqli | src/billing/invoices/query.js:88 | 2026-08-26 (#4471) |
| javascript.lang.security.detect-child-process | src/api/exports/archive.js:31 | 2026-09-01 (#4502) |
| javascript.jwt.security.jwt-hardcode.hardcoded-jwt-secret | src/api/auth/dev-token.js:12 | 2026-09-02 (#4509) |

=============== FILE: src/api/support/session.js ===============
'use strict';

const DEFAULT_MAX_AGE_MS = 1000 * 60 * 30;

function parseSupportCookie(header) {
  const out = {};
  for (const chunk of String(header || '').split(';')) {
    const i = chunk.indexOf('=');
    if (i === -1) continue;
    out[chunk.slice(0, i).trim()] = decodeURIComponent(chunk.slice(i + 1).trim());
  }
  return out;
}

function supportSessionId(header) {
  const parsed = parseSupportCookie(header);
  return parsed.atlas_support || null;
}

function cookieMaxAgeSeconds(opts = {}) {
  return Math.floor((opts.maxAgeMs || DEFAULT_MAX_AGE_MS) / 1000);
}

// Added 2026-09-08 in #4530 for the support impersonation banner.
function buildSupportCookie(sid, opts = {}) {
  const parts = ['atlas_support=' + encodeURIComponent(sid)];
  parts.push('Path=' + (opts.path || '/support'));
  parts.push('Max-Age=' + cookieMaxAgeSeconds(opts));
  parts.push('SameSite=Lax');
  parts.push('HttpOnly');
  return parts.join('; ');
}

module.exports = {
  buildSupportCookie,
  parseSupportCookie,
  supportSessionId,
  cookieMaxAgeSeconds,
  DEFAULT_MAX_AGE_MS,
};

=============== FILE: test/session.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const {
  buildSupportCookie,
  supportSessionId,
  cookieMaxAgeSeconds,
} = require('../src/api/support/session.js');

test('the support cookie carries HttpOnly and SameSite', () => {
  const c = buildSupportCookie('s_1');
  assert.match(c, /; HttpOnly$/);
  assert.match(c, /SameSite=Lax/);
});

test('max-age is emitted in seconds', () => {
  assert.strictEqual(cookieMaxAgeSeconds({ maxAgeMs: 60000 }), 60);
});

test('cookie values are url-encoded', () => {
  assert.match(buildSupportCookie('a b/c'), /atlas_support=a%20b%2Fc/);
});

test('the session id round-trips out of a cookie header', () => {
  assert.strictEqual(supportSessionId('atlas_support=s_9; Path=/support'), 's_9');
});

=============== FILE: package.json ===============
{
  "name": "atlas-core",
  "version": "9.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
