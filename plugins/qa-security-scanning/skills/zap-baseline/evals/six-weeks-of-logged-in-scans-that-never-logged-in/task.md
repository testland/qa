# Sign-off wanted: we say our nightly scan covers the product behind the login

## Problem Description

Brightpath sells an operations console at `console.brightpath.dev`. A handful of
public pages — the marketing home, pricing, a status page, signup, and the login
page itself — and about forty screens behind the login that are the product.

Six weeks ago Marek added authentication to the nightly scan so it would cover
the product and not just the brochure. He built the context file in the desktop
tool, exported it, committed it, and wired it into the nightly job. The job has
been green every night since.

Here is what I want a second opinion on. Before the change the nightly report had
eleven alerts. After the change it has eleven alerts. Marek's read is that this
is good news — the console was written by the current team with a security review
on every PR, while the public pages are a 2019 marketing site nobody has touched,
so eleven-and-unchanged is exactly what a clean product looks like. He has been
here four years and he is usually right about this stuff.

When I pushed on it yesterday he offered a way to settle it that I would also
like your view on. His words: "if you do not trust the context file, throw it
away. Put a curl step at the top of the job that posts the login, pull the
session cookie out of the response and hand it to the scanner as a fixed header
for the run. Ten lines of bash, no desktop tool, no XML, and I can have it in
tonight." For what it is worth, when he crawled the console by hand from his
laptop last month it took a little under an hour.

What I need is narrower than any of that, though. We are filling in a security
questionnaire for a prospect, Halvard, that closes at the end of the month.
Three of the items are mine to sign, and Marek has already pencilled in answers:

- **4.2** — "Do you perform authenticated dynamic security testing against the
  application?" His answer: "Yes, nightly, since 1 August."
- **4.5** — "Are findings from dynamic testing triaged and remediated within 30
  days?" His answer: "Yes."
- **4.7** — "Do you perform unauthenticated dynamic security testing of
  internet-facing applications?" His answer: "Yes, nightly."

If I sign something that is not true, that is a very bad day for me later. I
pulled everything I could find: the context file as committed, the nightly
workflow, the alert comparison before and after the change, the API gateway
access log from one night's scan window, our internal notes for the session
endpoints, and the small lint we run over the context file in CI.

Tell me which of the three I can sign, what to change, and what has to happen
before any answer I cannot sign today becomes one I can.

## Output Specification

1. `docs/auth-scan-findings.md` — what you found and the evidence for each
   finding, your answer on each of items 4.2, 4.5 and 4.7, what must be true
   before an answer changes, and your view on Marek's proposal.
2. `.zap/context.xml` — corrected.
3. `.github/workflows/dast-nightly.yml` — corrected if your findings require it.
4. `node scripts/context-lint.js .zap/context.xml` must exit 0 when you are
   done, and `npm test` must pass.
5. Do not edit `reports/gateway-log.md`, `reports/alert-comparison.md` or
   `docs/api-notes.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "brightpath-console-ci",
  "version": "8.0.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: .zap/context.xml ===============
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <context>
    <name>console-auth</name>
    <desc>Nightly authenticated scan of the ops console. Exported 2026-08-01 by marek.</desc>
    <inscope>true</inscope>
    <incregexes>https://console\.brightpath\.dev/.*</incregexes>
    <excregexes>https://console\.brightpath\.dev/login.*</excregexes>
    <excregexes>https://console\.brightpath\.dev/api/session.*</excregexes>
    <excregexes>https://console\.brightpath\.dev/admin/purge.*</excregexes>
    <authentication>
      <type>formBasedAuthentication</type>
      <loginurl>https://console.brightpath.dev/api/session</loginurl>
      <loginRequestData>username={%username%}&amp;password={%password%}</loginRequestData>
      <usernameParam>username</usernameParam>
      <passwordParam>password</passwordParam>
    </authentication>
    <verification>
      <strategy>EACH_RESP</strategy>
      <loggedInRegex></loggedInRegex>
      <loggedOutRegex></loggedOutRegex>
      <pollFrequency>60</pollFrequency>
    </verification>
    <session>
      <type>httpAuthSessionManagement</type>
    </session>
    <users>
      <user>
        <name>scanner</name>
        <enabled>true</enabled>
        <credentials>
          <username>scanner@brightpath.dev</username>
          <password>Sc4nner!Nightly2026</password>
        </credentials>
      </user>
    </users>
  </context>
</configuration>

=============== FILE: .zap/README.md ===============
# .zap

`context.xml` is exported from the desktop tool and committed. Regenerate it
there rather than hand-editing if you can; hand edits are fine for the URL
patterns.

The `/admin/purge` exclusion is deliberate and must stay. That endpoint
permanently deletes tenant data and has no confirmation step on the GET — it is
on the list to fix and until then no crawler goes near it.

=============== FILE: .github/workflows/dast-nightly.yml ===============
name: DAST nightly (console)

on:
  schedule:
    - cron: "0 1 * * *"
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Lint the context file
        run: node scripts/context-lint.js .zap/context.xml
      - name: Authenticated crawl
        run: |
          docker run --rm -v $(pwd):/zap/wrk/:rw \
            ghcr.io/zaproxy/zaproxy:stable \
            zap-baseline.py \
              -t https://console.brightpath.dev \
              -n /zap/wrk/.zap/context.xml \
              -J zap-report.json
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: zap-nightly, path: zap-report.json }

=============== FILE: scripts/context-lint.js ===============
'use strict';

const fs = require('node:fs');

// A committed context file may reference a credential but never carry one.
const REFERENCE = /^(\$\{[A-Z0-9_]+\}|%[A-Z0-9_]+%)$/;

function lint(xml) {
  const problems = [];
  if (!/<name>[^<]+<\/name>/.test(xml)) problems.push('context has no name');
  for (const match of xml.matchAll(/<(username|password)>([\s\S]*?)<\/\1>/g)) {
    const field = match[1];
    const value = match[2].trim();
    if (value && !REFERENCE.test(value)) {
      problems.push('literal ' + field + ' committed in the context file');
    }
  }
  return problems;
}

if (require.main === module) {
  const file = process.argv[2] || '.zap/context.xml';
  const problems = lint(fs.readFileSync(file, 'utf8'));
  for (const p of problems) console.log(p);
  console.log(problems.length + ' problem(s) in ' + file);
  process.exit(problems.length ? 1 : 0);
}

module.exports = { lint };

=============== FILE: scripts/context-lint.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { lint } = require('./context-lint');

const wrap = (inner) => '<context><name>x</name>' + inner + '</context>';

test('a literal password is reported', () => {
  const problems = lint(wrap('<password>hunter2</password>'));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /literal password/);
});

test('an environment reference is accepted', () => {
  assert.deepEqual(lint(wrap('<password>${ZAP_PASSWORD}</password>')), []);
  assert.deepEqual(lint(wrap('<username>%ZAP_USER%</username>')), []);
});

test('an empty credential element is accepted', () => {
  assert.deepEqual(lint(wrap('<password></password>')), []);
});

test('a context with no name is reported', () => {
  assert.deepEqual(lint('<context></context>'), ['context has no name']);
});

=============== FILE: reports/alert-comparison.md ===============
# Nightly report, before and after the authentication change

| | 2026-07-25 (before) | 2026-09-09 (after) |
|---|---|---|
| Alerts | 11 | 11 |
| URLs in the site tree | 4 | 4 |
| Run time | 2m 10s | 2m 14s |

The four URLs, both nights, identical:

```
https://console.brightpath.dev/
https://console.brightpath.dev/pricing
https://console.brightpath.dev/status
https://console.brightpath.dev/signup
```

All eleven alerts are against those four URLs both nights. Nine are header and
cookie alerts on `/` and `/pricing`. Two are on `/signup`. The eleven have the
same rule ids on both nights. None of the eleven has a ticket against it in the
tracker; the oldest report still in artifact retention, 2026-06-28, lists the
same eleven.

The frontend router table has 46 entries. Five of them are the public pages and
the login page. The rest — the tenant list, per-tenant settings, user admin, API
token management, the audit log, billing, the runbook editor, the alert-rule
editor, the integrations pages, the export tool and everything under `/admin/` —
appear in neither report.

=============== FILE: reports/gateway-log.md ===============
# API gateway access log — scan window 2026-09-09 01:00–01:03 UTC

Filtered to 10.40.7.19, the scan runner. Fields: time, method, path, status,
request content-type, cookie names on the request, Authorization header.

```
01:00:11 POST /api/session       415  ct=application/x-www-form-urlencoded  cookies=-  auth=-
01:00:12 GET  /                  200  ct=-                                  cookies=-  auth=-
01:00:13 GET  /pricing           200  ct=-                                  cookies=-  auth=-
01:00:13 POST /api/session       415  ct=application/x-www-form-urlencoded  cookies=-  auth=-
01:00:14 GET  /tenants           302  ct=-                                  cookies=-  auth=-
01:00:15 GET  /status            200  ct=-                                  cookies=-  auth=-
01:00:16 GET  /settings/profile  302  ct=-                                  cookies=-  auth=-
01:00:17 GET  /logout            302  ct=-                                  cookies=-  auth=-
01:00:18 GET  /signup            200  ct=-                                  cookies=-  auth=-
01:00:19 GET  /audit             302  ct=-                                  cookies=-  auth=-
01:00:19 POST /api/session       415  ct=application/x-www-form-urlencoded  cookies=-  auth=-
```

Totals for the whole window, same source:

| Count | Request             | Status | Notes from the gateway |
|-------|---------------------|--------|------------------------|
| 38    | POST /api/session   | 415    | —                      |
| 6     | GET /logout         | 302    | Set-Cookie: bp_session=; Max-Age=0 |
| 51    | GET /tenants        | 302    | Location: /login       |
| 44    | GET /settings/*     | 302    | Location: /login       |
| 12    | GET /audit          | 302    | Location: /login       |
| 4     | GET / /pricing /status /signup | 200 | —           |

Requests in the window carrying a `bp_session` cookie: 0.
Requests in the window carrying an `Authorization` header: 0.
Responses in the window with a `2xx` status other than the four public pages: 0.

Same shape on every night sampled: 2026-08-04, 2026-08-19, 2026-09-01,
2026-09-09.

=============== FILE: docs/api-notes.md ===============
# Session endpoints — internal notes

## POST /api/session

Rewritten in April 2026 when the login page moved to React.

- Request content type: `application/json`. Anything else returns 415.
- Body: `{"email": "...", "password": "..."}`.
- Success: `204`, plus `Set-Cookie: bp_session=<opaque>; HttpOnly; Secure;
  SameSite=Lax; Path=/; Max-Age=900`.
- The cookie is reissued on every authenticated response. A session that goes
  15 minutes without a request is gone and the next request 302s to `/login`.

## GET /logout

Clears `bp_session` and redirects to `/login`. Idempotent, no confirmation, no
POST required — it has been on our list to change since 2024.

## Authenticated pages

Every route other than `/`, `/pricing`, `/status`, `/signup` and `/login`
returns `302 -> /login` without a valid `bp_session`.

## Response body excerpts, captured by hand 2026-09-10

Signed-in shell, `GET /tenants` 200:

```html
<body data-tenant="acme-prod">
  <header class="app-nav">
    <span class="who">Signed in as scanner@brightpath.dev</span>
    <a href="/logout">Sign out</a>
  </header>
```

Login page, `GET /login` 200:

```html
<main class="auth">
  <h1>Sign in to Brightpath</h1>
```

Login page after a rejected attempt:

```html
  <p class="error">Those details did not match</p>
```
