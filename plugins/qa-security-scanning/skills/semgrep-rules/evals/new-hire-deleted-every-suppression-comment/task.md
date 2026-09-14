# Review the PR that strips every scanner suppression out of the repo

## Problem Description

Joel started nine days ago. His onboarding ticket said "clean up stale scanner
suppressions", which is a ticket I wrote eighteen months ago and forgot about,
so this one is on me. He has opened PR #1180 (`chore: strip suppressions`) which
deletes all fourteen suppression comments in `hollowpoint/ledger` and nothing
else. His description is in `docs/pr-1180.md` and it is a perfectly sensible
argument: none of them say why they exist, several are older than anyone still
on the team, and he could not find a single person who could explain one.

CI on his branch is red with **63 findings**. He has asked me whether he should
now fix all 63 or whether the PR should be closed. I do not want to answer
either of those, because I am fairly sure both are wrong, and I am equally sure
that merging fourteen deletions on the grounds that nobody remembers them is
not a review.

I pulled an inventory of the fourteen into `reports/suppression-inventory.md`
and attached the files they live in. One of them I want you to look at closely:
`src/integrations/acme/client.js` line 9. We deploy with Helm and I have
attached `deploy/prod-values.yaml` from the production release. I noticed
something when I put the two side by side and I would like a second opinion
before I say it out loud on a Monday.

Give me a review I can paste into the PR. Joel is nine days in and did the work
he was asked to do, so wherever he was right, say he was right. Where something
of his has to come back, I need the reason in a form he can apply to the next
one himself, not "ask me next time".

`npm test` is green on that branch and has to stay green.

## Output Specification

1. Write `docs/pr-1180-review.md` — a verdict for each suppression in the
   inventory (keep as-is, keep but changed, or stay deleted), the reason, and
   what has to be true before #1180 merges.
2. Apply your decisions to the attached source files and to `.semgrep.yml`.
   Restore or rewrite whatever you decided comes back; leave deleted whatever
   you decided stays deleted.
3. Write `docs/urgent.md` for anything in here that must not wait for the PR to
   land, naming the item and the first action.
4. Do not modify the tests.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/pr-1180.md ===============
# PR #1180 — chore: strip suppressions

Opened by @joel.arrindell, 2026-09-11.

Onboarding ticket LED-88 says to clean up stale scanner suppressions. I went
through every one of them. Here is what I found:

- Not one of the fourteen says what it is for. Nine are a bare comment with no
  rule name on it at all.
- `git blame` puts six of them in 2023 and 2024. I asked in #eng and nobody
  recognised any of them. Two of the authors have left.
- Three of them sit on lines that were rewritten after the comment was added,
  so whatever they were suppressing may not even be there any more.

A suppression nobody can explain is the same as no rule at all, except it looks
like coverage on a dashboard. I have removed all fourteen. The branch is red
with 63 findings, which I think is the honest number and we should work it down
rather than keep pretending it is zero.

Happy to take this in pieces if that is easier to review.

=============== FILE: reports/suppression-inventory.md ===============
# Suppression inventory — hollowpoint/ledger @ main (before #1180)

Fourteen suppression comments, grouped. Findings counts are from the scan on
Joel's branch with all fourteen removed (63 total).

| # | Location | Comment as written | Rule it silences | Findings if removed |
|---|---|---|---|---|
| 1 | tests/fixtures/stub-credentials.js:7 | `// nosemgrep: generic.secrets.security.detected-generic-api-key` | detected-generic-api-key | 1 |
| 2-9 | src/proto/billing_pb.js (8 separate lines) | `// nosemgrep` (bare) | mixed; file is code-generated | 40 |
| 10 | src/integrations/acme/client.js:9 | `// nosemgrep` (bare) | detected-generic-api-key | 1 |
| 11 | src/api/upload.js:22 | `// nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal` + 3 justification lines | path-join-resolve-traversal | 1 |
| 12 | src/util/exec.js:14 | `// nosemgrep` (bare) | detect-child-process (and everything else on that line) | 2 |
| 13-14 | src/api/upload.js:44, src/util/exec.js:31 | `// nosemgrep` (bare) | leftover-debugging | 18 |

Notes gathered while pulling this together:

- `src/proto/billing_pb.js` is emitted by `protoc` on every build; the header
  says "DO NOT EDIT". The eight comments were hand-added in 2024 and the file
  has been regenerated 200+ times since, so they survive only because whoever
  added them patched the generator template.
- #11 is the only one with any explanation attached to it at all.
- #1's file header documents the value as a throwaway used by the auth stubs.

=============== FILE: src/integrations/acme/client.js ===============
'use strict';

const https = require('node:https');

const ACME_BASE = 'https://api.acme-billing.example.com/v2';

// Suppression removed by #1180; shown here as it was on main:
//   // nosemgrep
const ACME_TOKEN = 'acme_live_2f8d41b09ce74a7f9db35c1e';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      ACME_BASE + path,
      { method: 'POST', headers: { authorization: 'Bearer ' + ACME_TOKEN } },
      (res) => resolve(res.statusCode),
    );
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });
}

module.exports = { post, ACME_BASE };

=============== FILE: deploy/prod-values.yaml ===============
# Helm values — production release ledger-prod-41, applied 2026-08-30.
replicaCount: 6

image:
  repository: ghcr.io/hollowpoint/ledger
  tag: "9.4.2"

env:
  NODE_ENV: production
  LEDGER_REGION: eu-west-1

integrations:
  acme:
    baseUrl: https://api.acme-billing.example.com/v2
    # Injected into the pod as ACME_TOKEN. Rotated manually; last rotation
    # 2025-02-14 by p.novak.
    token: "acme_live_2f8d41b09ce74a7f9db35c1e"
  stripe:
    secretRef: ledger-stripe-secret

=============== FILE: tests/fixtures/stub-credentials.js ===============
// Fixtures for the auth stub server. Nothing here is real, nothing here is
// ever sent off-box: the stub server answers on 127.0.0.1 and is torn down in
// the test teardown. Do not reuse these values anywhere outside tests/.

// Suppression removed by #1180; shown here as it was on main:
//   // nosemgrep: generic.secrets.security.detected-generic-api-key
const STUB_API_KEY = 'sk_test_REDACTED';

const STUB_USERS = [
  { id: 'u_1', email: 'ada@example.test', role: 'admin' },
  { id: 'u_2', email: 'grace@example.test', role: 'viewer' },
];

module.exports = { STUB_API_KEY, STUB_USERS };

=============== FILE: src/api/upload.js ===============
'use strict';

const path = require('node:path');

const UPLOAD_ROOT = '/var/lib/ledger/uploads';

function resolveUploadPath(tenantId, filename) {
  const base = path.join(UPLOAD_ROOT, tenantId);
  // Suppression removed by #1180; shown here as it was on main:
  //   // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal
  //   // Reason: filename is validated by assertSafeName above
  //   // Reviewer: p.novak@hollowpoint.example (2025-09-01)
  //   // Expires: 2026-03-01
  const rel = path.relative(path.resolve(base), path.resolve(base, filename));
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('path escapes tenant root');
  }
  return path.join(base, rel);
}

function describeUpload(tenantId, filename, bytes) {
  // Suppression removed by #1180; shown here as it was on main:
  //   // nosemgrep
  return { tenantId, filename, bytes, path: resolveUploadPath(tenantId, filename) };
}

module.exports = { resolveUploadPath, describeUpload, UPLOAD_ROOT };

=============== FILE: src/util/exec.js ===============
'use strict';

const { execFile } = require('node:child_process');

const ALLOWED = new Set(['pdftotext', 'qpdf']);

function runTool(name, args) {
  if (!ALLOWED.has(name)) throw new Error('tool not allowed: ' + name);
  return new Promise((resolve, reject) => {
    // Suppression removed by #1180; shown here as it was on main:
    //   // nosemgrep
    execFile(name, args, { timeout: 20000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function toolBanner() {
  // Suppression removed by #1180; shown here as it was on main:
  //   // nosemgrep
  return 'tools: ' + [...ALLOWED].sort().join(', ');
}

module.exports = { runTool, toolBanner, ALLOWED };

=============== FILE: src/proto/billing_pb.js ===============
// Code generated by protoc-gen-js. DO NOT EDIT.
// source: billing/v2/billing.proto
// Regenerated on every build by `npm run proto`. 4,118 lines in the real file;
// the first few are reproduced here.

/* eslint-disable */
var jspb = { Message: function () {} };
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.billing.v2.Invoice', null, global);
goog.exportSymbol('proto.billing.v2.LineItem', null, global);

proto.billing.v2.Invoice = function (opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};

proto.billing.v2.Invoice.prototype.getToken = function () {
  return jspb.Message.getFieldWithDefault(this, 7, '');
};

=============== FILE: .semgrep.yml ===============
rules: []

# Registry rulesets are passed on the command line; this file exists for the
# path configuration and for custom rules when we get round to writing any.
paths:
  exclude:
    - node_modules
    - dist

=============== FILE: test/upload.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { resolveUploadPath, describeUpload, UPLOAD_ROOT } = require('../src/api/upload.js');

test('resolves a filename under the tenant root', () => {
  const p = resolveUploadPath('t_42', 'invoice.pdf');
  assert.strictEqual(p, path.join(UPLOAD_ROOT, 't_42', 'invoice.pdf'));
});

test('rejects a filename that climbs out of the tenant root', () => {
  assert.throws(() => resolveUploadPath('t_42', '../t_43/secret.pdf'), /escapes tenant root/);
});

test('rejects an absolute filename', () => {
  assert.throws(() => resolveUploadPath('t_42', '/etc/passwd'), /escapes tenant root/);
});

test('describeUpload carries the resolved path', () => {
  const d = describeUpload('t_42', 'a.pdf', 120);
  assert.strictEqual(d.bytes, 120);
  assert.strictEqual(d.path, path.join(UPLOAD_ROOT, 't_42', 'a.pdf'));
});

=============== FILE: package.json ===============
{
  "name": "ledger",
  "version": "9.4.2",
  "private": true,
  "scripts": {
    "test": "node --test",
    "proto": "protoc --js_out=import_style=commonjs,binary:src ./proto/billing/v2/billing.proto"
  }
}
