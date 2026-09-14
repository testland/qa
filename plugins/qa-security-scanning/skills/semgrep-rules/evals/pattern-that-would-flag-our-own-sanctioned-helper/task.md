# We need a pattern for LED-2291 that does not light up our own shell helper

## Problem Description

On 2026-09-02 a customer-supplied filename reached a shell command in our render
worker. Writeup is `docs/incident-2026-09-02.md`. Action item AI-2 is mine: a
detection that stops the same shape of code reaching main again. The three known
call sites are already ticketed and being fixed by their owners this sprint — I
do not need you to fix them, I need the detection.

The complication, and the reason I am handing this out rather than doing it in
ten minutes, is `lib/shell.js`. That is our one sanctioned way to shell out. The
platform team wrote it, they own it, every argument that goes through it is
escaped there, and it is signed off by security as the approved path. It is also,
necessarily, a file that builds a command string and runs it — which from the
outside looks exactly like the thing I am trying to catch. Everything else in the
codebase is supposed to go through it.

There is also a lot of perfectly ordinary shelling out with fixed strings —
`scripts/release.js` alone has eleven of them, things like tagging and checking a
git revision, with nothing variable anywhere near them. Those have never been a
problem and I am not going to make eleven people justify them.

Two proposals came in on the thread (`docs/eng-thread.md`) and I do not love
either. Read them, they are attached. The thing I will not accept is a detection
that goes in on Monday and is quietly neutralised by Thursday because it shouts
at code that is fine — I have watched that happen twice here.

`.semgrep.yml` is where our own patterns are meant to live; it is empty except
for path config. The CI command lives in `.github/workflows/sast.yml` and today
runs two pinned community rulesets, which I want to keep.

`npm test` is green and must stay green.

## Output Specification

1. Write the detection into `.semgrep.yml`.
2. Update `.github/workflows/sast.yml` so it runs in CI.
3. Write `docs/led-2291-detection.md`: which of the attached files the detection
   fires on and which it deliberately does not, how you verified that before
   shipping, a direct answer to each of the two proposals on the thread, and what
   a developer should do when it fires on them legitimately.
4. Do not change application code and do not change the tests.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/incident-2026-09-02.md ===============
# LED-2291 — command injection in the render worker

**Severity:** SEV-1. **Detected:** 2026-09-02 by an internal bug bounty report.

A customer-supplied `filename` was interpolated into a template literal and
passed to `child_process.exec` in `src/jobs/render.js`. A filename of
`a.pdf; curl …` executed. No evidence of exploitation outside the report.

## Known call sites of the same shape

Found by grep on 2026-09-03. All three are ticketed and owned:

| File | Line | Shape | Ticket |
|---|---|---|---|
| src/jobs/render.js | 18 | template literal into `exec`, destructured import | LED-2293 |
| src/jobs/render.js | 30 | template literal into `exec`, destructured import | LED-2294 |
| src/jobs/backup.js | 21 | string concatenation into `execSync` | LED-2295 |

Grep is not a control. AI-2: a detection in the pipeline, by 2026-09-19.

## Not in scope

`lib/shell.js` builds and runs a command by design; it is the reviewed,
approved path and is excluded from the three tickets above.

=============== FILE: docs/eng-thread.md ===============
# #eng-sec — LED-2291 AI-2, 2026-09-08

**m.oyelaran** — Simplest thing that works: match any call to exec or execSync
anywhere, full stop. That is 214 hits across the tree. We put a suppression
comment on lib/shell.js and on the release scripts, which are the only
legitimate ones, and then the rule is absolute and nobody argues about it at
review time. Suppression comments are two seconds each and we only pay it once.

**s.trewin** — Do we even need our own pattern? Switch the config over to
registry auto-detection and it will pull in whatever command-injection rules
exist for our stack. Less for us to maintain, and it is one flag.

**m.oyelaran** — Auto did not flag render.js line 18 when I tried it on my
branch on Friday, for whatever that is worth.

**b.ferreira** — 214 hits is 211 people finding out their perfectly fine code is
now a security finding. That is how the dependency check died here in 2024.

=============== FILE: lib/shell.js ===============
'use strict';

// The sanctioned path for running an external tool. Reviewed by security,
// owned by platform. Nothing else in this repo may call child_process directly.

const { exec } = require('node:child_process');

const ALLOWED_TOOLS = new Set(['git', 'pdftotext', 'qpdf', 'convert']);

function quoteArg(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildCommand(tool, args) {
  if (!ALLOWED_TOOLS.has(tool)) throw new Error('tool not allowed: ' + tool);
  if (!Array.isArray(args)) throw new TypeError('args must be an array');
  return [tool, ...args.map(quoteArg)].join(' ');
}

function run(tool, args, opts = {}) {
  const command = buildCommand(tool, args);
  return new Promise((resolve, reject) => {
    exec(command, { timeout: opts.timeoutMs || 30000 }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stderr }));
      resolve(stdout);
    });
  });
}

module.exports = { run, buildCommand, quoteArg, ALLOWED_TOOLS };

=============== FILE: src/jobs/render.js ===============
'use strict';

const { exec } = require('node:child_process');
const path = require('node:path');

const WORK_DIR = '/var/lib/ledger/render';

function rasterize(filename, pages) {
  const target = path.join(WORK_DIR, filename);
  return new Promise((resolve, reject) => {
    exec(`pdftotext -f 1 -l ${pages} ${target}`, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function thumbnail(filename, size) {
  return new Promise((resolve, reject) => {
    exec(`convert ${path.join(WORK_DIR, filename)} -resize ${size} out.png`, (err) => {
      if (err) return reject(err);
      resolve(path.join(WORK_DIR, 'out.png'));
    });
  });
}

module.exports = { rasterize, thumbnail, WORK_DIR };

=============== FILE: src/jobs/backup.js ===============
'use strict';

const cp = require('node:child_process');

const SNAPSHOT_ROOT = '/var/backups/ledger';

function currentRevision() {
  return cp.execSync('git rev-parse HEAD').toString().trim();
}

function snapshot(tenantId) {
  return cp.execSync('qpdf --check ' + SNAPSHOT_ROOT + '/' + tenantId + '.pdf').toString();
}

module.exports = { snapshot, currentRevision, SNAPSHOT_ROOT };

=============== FILE: scripts/release.js ===============
'use strict';

const { execSync } = require('node:child_process');

function tagRelease() {
  execSync('git fetch --tags');
  execSync('git describe --tags --abbrev=0');
  execSync('git rev-parse --abbrev-ref HEAD');
  execSync('npm pack --dry-run');
  return execSync('git log -1 --pretty=%H').toString().trim();
}

module.exports = { tagRelease };

=============== FILE: .semgrep.yml ===============
rules: []

paths:
  exclude:
    - node_modules
    - dist
    - vendor

=============== FILE: .github/workflows/sast.yml ===============
name: sast

on:
  pull_request:
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
          semgrep ci \
            --config p/owasp-top-ten \
            --config p/javascript \
            --sarif --output=semgrep.sarif \
            --metrics=off

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif

=============== FILE: test/shell.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { buildCommand, ALLOWED_TOOLS } = require('../lib/shell.js');

test('rejects a tool that is not on the allowlist', () => {
  assert.throws(() => buildCommand('curl', ['http://example.test']), /not allowed/);
});

test('allowlist holds the four approved tools', () => {
  assert.deepStrictEqual([...ALLOWED_TOOLS].sort(), ['convert', 'git', 'pdftotext', 'qpdf']);
});

test('arguments are quoted, not concatenated raw', () => {
  const cmd = buildCommand('pdftotext', ['a b.pdf; curl evil.test']);
  assert.strictEqual(cmd, "pdftotext 'a b.pdf; curl evil.test'");
});

test('embedded single quotes are escaped', () => {
  assert.strictEqual(buildCommand('git', ["it's"]), "git 'it'\\''s'");
});

test('non-array args are rejected', () => {
  assert.throws(() => buildCommand('git', 'status'), TypeError);
});

=============== FILE: test/backup.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { SNAPSHOT_ROOT } = require('../src/jobs/backup.js');

test('snapshot root is the expected absolute path', () => {
  assert.strictEqual(SNAPSHOT_ROOT, '/var/backups/ledger');
});

test('snapshot root is absolute', () => {
  assert.ok(SNAPSHOT_ROOT.startsWith('/'));
});

=============== FILE: package.json ===============
{
  "name": "ledger-render",
  "version": "2.11.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
