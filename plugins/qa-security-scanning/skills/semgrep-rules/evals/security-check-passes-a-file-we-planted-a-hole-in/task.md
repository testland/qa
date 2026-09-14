# Our static-analysis check goes green on a file we deliberately broke

## Problem Description

Northwind Freight sent us a security questionnaire on 2026-09-09. Question 4.2
asks us to demonstrate that our static-analysis check blocks a merge, not just
that we run one. Our answer is due Tuesday and I cannot write it, because when
I actually tested it the check went green.

Here is exactly what I did on Wednesday. I pushed branch `gate-probe` with one
file, `security/gate-probe/probe.js`, containing a textbook SQL-injection
string concatenation and a hardcoded API token. I opened PR #812 from it. The
`sast` check ran for 51 seconds and reported **success**. I have attached the
raw job log from that run (`logs/run-9911-sast.txt`) — the analyzer clearly
found both problems and printed them, and the step still finished green. GitHub
merged the PR without a single complaint.

Things I have already ruled out, so please do not spend the afternoon on them:

- The check *is* a required status check. I exported the branch-protection
  settings to `config/branch-protection.json`; `sast` is in the list.
- The analyzer is not silently erroring. The log shows it scanned 118 files and
  printed findings with real rule IDs and severities.
- Nobody has `continue-on-error` set on that step. The workflow file is
  attached; read it yourself.

Two people have already told me two different things. Our platform lead thinks
the community ruleset we pinned is too narrow and we should switch the config
over to registry auto-detection so it picks up "everything". Our other backend
dev thinks GitHub is caching the check result. Neither explanation accounts for
the findings being printed in the log of a passing step, which is the bit that
bothers me.

`security/gate-probe/probe.js` has to stay exactly as it is. It is the only
thing we have that tells us whether the check actually works, and I want to
re-run the same probe after whatever you change and get a red check out of it.

`npm test` is green on main today and needs to stay that way.

## Output Specification

1. Fix `.github/workflows/sast.yml`.
2. Write `docs/gate-evidence.md`: the specific reason PR #812 went green, what
   you changed, and the exact steps I repeat to re-prove the check blocks a
   merge. This text goes to Northwind, so name the mechanism, not a vibe.
3. Do not modify `security/gate-probe/probe.js`, and do not modify the tests.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/sast.yml ===============
name: sast

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  sast:
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:1.99.0
    steps:
      - uses: actions/checkout@v5

      - name: Static analysis
        run: |
          semgrep scan \
            --config p/owasp-top-ten \
            --config p/javascript \
            --json --output semgrep.json \
            --metrics=off

      - name: Keep the report
        uses: actions/upload-artifact@v4
        with:
          name: semgrep-json
          path: semgrep.json

=============== FILE: logs/run-9911-sast.txt ===============
2026-09-09T14:22:05.1188Z ##[group]Run semgrep scan --config p/owasp-top-ten --config p/javascript --json --output semgrep.json --metrics=off
2026-09-09T14:22:06.0021Z
2026-09-09T14:22:06.0022Z  ---- Semgrep CLI 1.99.0 ----
2026-09-09T14:22:06.4410Z Scanning 118 files tracked by git with 1042 rules.
2026-09-09T14:22:51.8830Z
2026-09-09T14:22:51.8831Z Findings:
2026-09-09T14:22:51.8832Z
2026-09-09T14:22:51.8840Z   security/gate-probe/probe.js
2026-09-09T14:22:51.8841Z      javascript.lang.security.audit.sqli.node-postgres-sqli.node-postgres-sqli
2026-09-09T14:22:51.8842Z         Detected string concatenation with a non-literal variable in a
2026-09-09T14:22:51.8843Z         node-postgres SQL statement. This could lead to SQL injection.
2026-09-09T14:22:51.8844Z         Severity: ERROR
2026-09-09T14:22:51.8845Z          14|   const sql = "SELECT * FROM shipments WHERE ref = '" + ref + "'";
2026-09-09T14:22:51.8846Z
2026-09-09T14:22:51.8850Z      generic.secrets.security.detected-generic-api-key.detected-generic-api-key
2026-09-09T14:22:51.8851Z         Generic API Key detected
2026-09-09T14:22:51.8852Z         Severity: ERROR
2026-09-09T14:22:51.8853Z           6| const NORTHWIND_TOKEN = "nw_live_8c41f0a9d7e24b6ab0f3";
2026-09-09T14:22:51.8854Z
2026-09-09T14:22:51.9001Z Ran 1042 rules on 118 files: 2 findings.
2026-09-09T14:22:56.2213Z ##[endgroup]
2026-09-09T14:22:56.4402Z Process completed with exit code 0.

=============== FILE: config/branch-protection.json ===============
{
  "repository": "northwind/freight-api",
  "branch": "main",
  "required_status_checks": {
    "strict": true,
    "contexts": ["build", "unit-tests", "sast"]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "enforce_admins": false,
  "exported_at": "2026-09-09T15:02:00Z"
}

=============== FILE: security/gate-probe/probe.js ===============
// Deliberately vulnerable. Pushed on branch `gate-probe` only, never merged to
// main. Exists so we can prove the blocking check actually blocks.

const { Client } = require('pg');

const NORTHWIND_TOKEN = "nw_live_8c41f0a9d7e24b6ab0f3";

async function lookupShipment(ref) {
  const client = new Client();
  await client.connect();
  const sql = "SELECT * FROM shipments WHERE ref = '" + ref + "'";
  const res = await client.query(sql);
  await client.end();
  return res.rows;
}

module.exports = { lookupShipment, NORTHWIND_TOKEN };

=============== FILE: src/reports/export.js ===============
'use strict';

const HEADERS = ['ref', 'origin', 'destination', 'weight_kg'];

function toCsvRow(values) {
  return values
    .map((v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    })
    .join(',');
}

function buildShipmentCsv(shipments) {
  const lines = [toCsvRow(HEADERS)];
  for (const s of shipments) {
    lines.push(toCsvRow([s.ref, s.origin, s.destination, s.weightKg]));
  }
  return lines.join('\n');
}

module.exports = { buildShipmentCsv, toCsvRow, HEADERS };

=============== FILE: test/export.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { buildShipmentCsv, toCsvRow } = require('../src/reports/export.js');

test('header row is emitted first', () => {
  const csv = buildShipmentCsv([]);
  assert.strictEqual(csv, 'ref,origin,destination,weight_kg');
});

test('rows follow the header in order', () => {
  const csv = buildShipmentCsv([
    { ref: 'NW-1', origin: 'HAM', destination: 'RTM', weightKg: 12 },
    { ref: 'NW-2', origin: 'RTM', destination: 'ANR', weightKg: 7 },
  ]);
  assert.deepStrictEqual(csv.split('\n'), [
    'ref,origin,destination,weight_kg',
    'NW-1,HAM,RTM,12',
    'NW-2,RTM,ANR,7',
  ]);
});

test('values containing commas or quotes are escaped', () => {
  assert.strictEqual(toCsvRow(['a,b', 'c"d']), '"a,b","c""d"');
});

test('null and undefined become empty fields', () => {
  assert.strictEqual(toCsvRow([null, undefined, 0]), ',,0');
});

=============== FILE: package.json ===============
{
  "name": "freight-api",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
