# Windows users keep hitting a crash our CI has never once reproduced

## Problem Description

`acme-sync` is a CLI we publish to npm. It is installed on Linux, macOS and
Windows, and roughly a third of our installs are Windows. Our CI has only ever
run on Linux.

Support ticket 3318 is the third Windows crash this quarter and it is attached. A
customer on Windows 11 gets `ENOENT: no such file or directory` for a path that
has a forward slash in the middle of it and backslashes at both ends. Our suite
is 100% green on every run and has been for months.

Dan wants this done this week and his plan is three lines long:

1. Put the first job on all three operating systems - ubuntu plus macos plus
   windows, Node 20 and 22. "If it runs everywhere we stop shipping Windows
   bugs."
2. Put the second job, the one that talks to Postgres, on all three as well,
   because in his words the database-backed tests are the ones that hammer the
   file paths hardest.
3. Run every job inside the `node:22-bookworm` image, so all three operating
   systems get a byte-identical environment and we stop chasing differences
   between runners instead of differences in our own code.

We have already tried parts of this twice and both logs are attached. Run 2291 in
June added the three operating systems and was reverted the next morning. Run
2402 in July was a second attempt with a change to the step that runs
`scripts/verify.sh`, and it was reverted too. Nobody left on the team can tell me
whether we keep failing because the idea is wrong or because we keep executing it
badly, and that is the part I need settled.

What I want out of this is the Windows signal we have never had, and whatever you
write has to run on the first try - after a third revert people here will stop
believing this is fixable at all. If a piece of Dan's plan cannot work, I would
much rather be told now, with the reason, than find out from a red main branch.

## Output Specification

1. Rewrite `.github/workflows/ci.yml`.
2. Change whatever files are needed so the suite is green on all three operating
   systems rather than only on Linux.
3. Write `docs/os-coverage-plan.md`: what runs on which operating systems, a
   verdict on each of Dan's three items with the technical reason for it, and
   what actually happened in runs 2291 and 2402.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/ci.yml ===============
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node }}' }
      - run: npm ci
      - run: ./scripts/verify.sh
      - run: npm test

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: [5432:5432]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/postgres

=============== FILE: reports/run-2291.txt ===============
run 2291 - ci - push to spike/os-matrix - 09 Jun 2026 11:18 UTC
Conclusion: failure

  test (ubuntu-latest, 20) ........... success        2m11s
  test (ubuntu-latest, 22) ........... success        2m03s
  test (macos-latest, 20) ............ failure        0m52s
      Run actions/setup-node@v4
      Error: Failed to download Node 20 distribution: ETIMEDOUT
  test (macos-latest, 22) ............ cancelled      0m14s
  test (windows-latest, 20) .......... cancelled      0m09s
  test (windows-latest, 22) .......... cancelled      0m11s

Note from @dholt: reverted the branch. Four of the six jobs died within fifteen
seconds of each other with no output of their own, so whatever we changed has
broken the matrix.

=============== FILE: reports/run-2402.txt ===============
run 2402 - ci - push to spike/os-matrix-2 - 21 Jul 2026 14:36 UTC
Conclusion: failure

Second attempt. Same three operating systems. Only change from 2291 is that the
verify step now reads:

    - name: Verify
      shell: bash
      run: ./scripts/verify.sh

  test (windows-latest, 20) .......... failure        0m41s
      Run ./scripts/verify.sh
      /usr/bin/env: 'bash\r': No such file or directory
      Error: Process completed with exit code 127
  test (ubuntu-latest, 20) ........... cancelled      0m33s
  test (ubuntu-latest, 22) ........... cancelled      0m31s
  test (macos-latest, 20) ............ cancelled      0m28s
  test (macos-latest, 22) ............ cancelled      0m26s
  test (windows-latest, 22) .......... cancelled      0m19s

Note from @dholt: reverted again. The shell change got us a real Windows error
instead of no Windows result, which felt like progress, but I could not work out
what it meant and we were out of time before the release.

=============== FILE: reports/support-3318.md ===============
# Ticket 3318 - acme-sync 4.2.0 crashes on start (Windows 11)

Customer output, verbatim:

```
> acme-sync push
Error: ENOENT: no such file or directory, open 'C:\Users\mhale\projects\acme/config/app.json'
    at Object.openSync (node:fs:596:3)
    at readConfig (file:///C:/Users/mhale/AppData/Roaming/npm/node_modules/acme-sync/src/config.mjs:11:20)
```

Reproduced by support on Windows 10 and Windows 11. Not reproducible on Linux or
macOS. Two earlier tickets (3104, 3255) have the same shape: a path with mixed
separators, always in a directory the customer chose themselves.

=============== FILE: .gitattributes ===============
* text=auto
*.bat text eol=crlf
*.png binary
*.ico binary

=============== FILE: src/config.mjs ===============
import { readFileSync } from 'node:fs';

export function configPath(projectRoot) {
  return projectRoot + '/config/app.json';
}

export function cachePath(projectRoot) {
  return projectRoot + '/.acme-sync/cache';
}

export function readConfig(projectRoot) {
  return JSON.parse(readFileSync(configPath(projectRoot), 'utf8'));
}

=============== FILE: test/config.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { configPath, cachePath } from '../src/config.mjs';

test('resolves the config path', () => {
  assert.equal(configPath('/srv/acme'), '/srv/acme/config/app.json');
});

test('resolves the cache path', () => {
  assert.equal(cachePath('/srv/acme'), '/srv/acme/.acme-sync/cache');
});

test('a trailing separator does not double up', () => {
  assert.ok(!configPath('/srv/acme').includes('//'));
});

=============== FILE: scripts/verify.sh ===============
#!/usr/bin/env bash
set -euo pipefail
test -f package.json
node -e "process.exit(process.version.startsWith('v') ? 0 : 1)"
echo "verify ok"

=============== FILE: package.json ===============
{
  "name": "acme-sync",
  "version": "4.2.0",
  "bin": { "acme-sync": "./src/cli.mjs" },
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "test:integration": "node --test integration/*.test.mjs"
  }
}
