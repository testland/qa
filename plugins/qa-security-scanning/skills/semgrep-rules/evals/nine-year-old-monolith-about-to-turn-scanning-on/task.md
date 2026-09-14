# Turning SAST on for a nine-year-old monolith without stopping the company

## Problem Description

`atlas-core` is nine years old, 340k lines of JavaScript, 22 engineers. We have
never had static analysis in the pipeline. That changed on 2026-08-22 when a
session-cookie bug let a support tool read a customer session — writeup is in
`docs/incident-2026-08-22.md`. Our VP committed to the board that scanning is
enforced by 2026-10-01, so this is happening; the question is only how.

I ran a pilot scan on a branch last Thursday. **1,847 findings.** The breakdown
by severity and by directory is in `reports/pilot-inventory.md`. Roughly four
fifths of it sits in `src/legacy/`, which is the 2017-era code nobody wants to
touch and which two of our biggest customers depend on.

There are two proposals on the table (`docs/rollout-thread.md`):

- **Marta** (staff, owns the pipeline) wants the blocking check to consider only
  the highest severity band, so we start with 212 findings instead of 1,847.
  Her argument is that a check that reports 1,847 things is a check the team
  learns to ignore in a week, and she has watched that happen at two previous
  companies.
- **Dev** wants `src/legacy/` out of the scan entirely, with a separate
  quarterly review of that tree. His argument is that we are not going to
  refactor 2017 code on a PR deadline, so scanning it just generates noise
  nobody can act on.

Both of them are describing a real problem. I do not want to pick one out of
politeness and find out in January that we shipped something that would not
have caught August's bug.

What I need from you is the enablement plan I can put in front of the VP on
Monday, plus the workflow file that implements it. Assume engineers will open
PRs against `main` the same afternoon it goes live. Do not fix application code
in this task — if something in the inventory has to be dealt with before we
switch over, say so in the plan and I will assign it.

`npm test` is green today and must stay green.

## Output Specification

1. Rewrite `.github/workflows/sast.yml` so it is the blocking PR check we are
   going live with, including the exact command line.
2. Write `docs/sast-rollout.md`: what blocks a PR and what does not, what
   happens to the 1,847 existing findings, anything that must be handled before
   the switch-over, and the mechanism and cadence for working the backlog down.
   Answer Marta's proposal and Dev's proposal directly and by name — both of
   them will read this.
3. Do not modify application code or tests.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/pilot-inventory.md ===============
# Pilot scan — atlas-core @ 7c31d0b — 2026-09-04

Command: `semgrep scan --config p/owasp-top-ten --config p/javascript --json`
Duration: 6m 41s. Files scanned: 2,914. Rules: 1,042.

## By severity

| Severity | Findings |
|---|---|
| ERROR   | 212   |
| WARNING | 1,338 |
| INFO    | 297   |
| **Total** | **1,847** |

## By directory

| Path | ERROR | WARNING | INFO | Total |
|---|---|---|---|---|
| src/legacy/    | 168 | 1,109 | 227 | 1,504 |
| src/billing/   | 21  | 94    | 31  | 146   |
| src/api/       | 14  | 79    | 22  | 115   |
| src/web/       | 6   | 41    | 14  | 61    |
| scripts/       | 3   | 15    | 3   | 21    |

## Findings first introduced in the last 14 days

Cross-referenced against `git log --since=2026-08-21`:

| Rule | Severity | Path | Introduced |
|---|---|---|---|
| javascript.lang.security.audit.sqli.node-postgres-sqli | ERROR | src/billing/invoices/query.js:88 | 2026-08-26 (#4471) |
| javascript.lang.security.detect-child-process | ERROR | src/api/exports/archive.js:31 | 2026-09-01 (#4502) |
| javascript.jwt.security.jwt-hardcode.hardcoded-jwt-secret | ERROR | src/api/auth/dev-token.js:12 | 2026-09-02 (#4509) |

The other 1,844 predate 2026-08-21.

## Top rules by count

| Rule | Severity | Count |
|---|---|---|
| javascript.express.security.audit.express-cookie-session-no-secure | WARNING | 61 |
| javascript.lang.security.audit.path-traversal.path-join-resolve-traversal | WARNING | 143 |
| javascript.lang.best-practice.leftover-debugging | INFO | 211 |
| javascript.express.security.audit.express-open-redirect | WARNING | 88 |

=============== FILE: docs/incident-2026-08-22.md ===============
# INC-2291 — support tool could read a customer session

**Severity:** SEV-2. **Detected:** 2026-08-22 09:14 UTC by a customer report.
**Contained:** 2026-08-22 17:40 UTC.

## What happened

`src/legacy/session/cookies.js` sets the session cookie without the `secure`
attribute. On the support subdomain, which had been served over plain HTTP
internally since a 2019 proxy change, the cookie was transmitted in clear text
on the internal network and a support tool logged it. 41 customer sessions were
affected. No evidence of external exposure.

## Would scanning have caught it?

Yes. We re-ran the pilot scan against the commit that introduced the line
(`e0a91c4`, 2019-11-05). It is flagged by
`javascript.express.security.audit.express-cookie-session-no-secure`, which
carries severity **WARNING** in the community ruleset. The same rule reports 61
findings across the current tree, 54 of them in `src/legacy/`.

## Action items

- AI-1: `src/legacy/session/cookies.js` fixed and shipped 2026-08-22 (#4468).
- AI-2: enforce static analysis in the pipeline by 2026-10-01. **This item.**
- AI-3: audit the remaining 60 occurrences of the same rule. Not started.

=============== FILE: docs/rollout-thread.md ===============
# #eng-platform — SAST enablement, 2026-09-05

**marta.reinholt** — 1,847 is not a number a team acts on, it is a number a team
routes to a folder. I have seen this twice. My proposal: gate the PR check on
the highest severity band only, which is 212 findings, and leave the rest as a
nightly informational report. We can widen later once the 212 are gone. If we
go live with all 1,847 blocking, someone will have the check switched off by
Friday and we will be back where we started with a board commitment behind us.

**dev.chaudhary** — Agreed on the noise, different cut. 1,504 of the 1,847 are
in src/legacy. That tree is frozen; we do not accept refactors to it outside a
scheduled window. Scanning it on every PR means every PR that touches a shared
util lights up with findings nobody is allowed to fix. Take src/legacy out of
the scan config, review it separately once a quarter.

**marta.reinholt** — I would take either over what we have now, which is nothing.

**t.okonkwo** — Both of these land before Monday or we are explaining a slipped
board commitment. Whoever picks this up: write it down so I can forward it.

=============== FILE: .github/workflows/sast.yml ===============
name: sast

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  nightly-scan:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:1.99.0
    steps:
      - uses: actions/checkout@v5
      - name: Informational scan
        continue-on-error: true
        run: |
          semgrep scan \
            --config p/owasp-top-ten \
            --config p/javascript \
            --text --metrics=off

=============== FILE: src/legacy/session/cookies.js ===============
'use strict';

const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 12;

function buildSessionCookie(sid, opts = {}) {
  const parts = ['atlas_sid=' + encodeURIComponent(sid)];
  parts.push('Path=' + (opts.path || '/'));
  parts.push('Max-Age=' + Math.floor((opts.maxAgeMs || DEFAULT_MAX_AGE_MS) / 1000));
  parts.push('SameSite=' + (opts.sameSite || 'Lax'));
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

function parseCookieHeader(header) {
  const out = {};
  for (const chunk of String(header || '').split(';')) {
    const i = chunk.indexOf('=');
    if (i === -1) continue;
    out[chunk.slice(0, i).trim()] = decodeURIComponent(chunk.slice(i + 1).trim());
  }
  return out;
}

module.exports = { buildSessionCookie, parseCookieHeader, DEFAULT_MAX_AGE_MS };

=============== FILE: test/cookies.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { buildSessionCookie, parseCookieHeader } = require('../src/legacy/session/cookies.js');

test('session cookie carries Secure and HttpOnly by default', () => {
  const c = buildSessionCookie('abc123');
  assert.match(c, /; Secure$/);
  assert.match(c, /; HttpOnly; /);
});

test('max-age is emitted in seconds', () => {
  const c = buildSessionCookie('abc123', { maxAgeMs: 60000 });
  assert.match(c, /Max-Age=60/);
});

test('cookie values are url-encoded', () => {
  assert.match(buildSessionCookie('a b/c'), /atlas_sid=a%20b%2Fc/);
});

test('header parsing round-trips a built cookie name', () => {
  const parsed = parseCookieHeader('atlas_sid=abc123; Path=/; SameSite=Lax');
  assert.strictEqual(parsed.atlas_sid, 'abc123');
  assert.strictEqual(parsed.Path, '/');
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
