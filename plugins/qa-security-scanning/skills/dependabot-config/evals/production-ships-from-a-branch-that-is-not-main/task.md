# Move the update bot onto release/3.2 - that is what is actually in production

## Problem Description

Context you will need: `main` carries the 4.0 rewrite and will not ship before
March. Everything in production runs from `release/3.2`, which we cut on
2026-05-11 and have been patching by hand ever since. `main` is the default
branch on GitHub and we are not changing that - 4.0 has a migration on it that
cannot be fast-forwarded onto the release line.

Four things, please, from Dana in platform security (she is the one who has to
sign the November audit pack):

1. Routine dependency pull requests should land on `release/3.2`. Right now
   they open against `main`, where nobody looks at them, and 60-odd are open.
2. "The CVE ones matter more than the routine ones, so make sure those come to
   `release/3.2` as well - that is the branch that is actually exposed."
3. "Pin `ws`. We are staying on 7.x this year, v8 changed the upgrade handling
   and our proxy tests fail on it. Stop the noise."
4. "On the release branch I only care about things that ship. Do not send me
   test tooling or type packages there."

Do the ones that can be done, and say plainly if any of them cannot be done the
way she has asked - she would much rather find out from you now than from the
auditor in November. The branching policy, the current file, the manifest and
last quarter's security review are attached.

## Output Specification

1. Update `.github/dependabot.yml`.
2. Write `docs/release-branch-updates.md` with one numbered section per request,
   each opening with a plain done / cannot be done as asked, and - where it
   cannot - what the team has to do instead so the production branch still ends
   up patched.
3. `test/config-shape.test.js` must still pass under `node --test`.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/dependabot.yml ===============
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "tuesday"
    open-pull-requests-limit: 10
    labels: ["dependencies"]

=============== FILE: docs/branching.md ===============
# Branching policy (revised 2026-05-11)

- `main` is the repository default branch. It carries 4.0 work only.
- `release/3.2` is the production branch. Every deploy since 2026-05-11 has
  been built from it.
- `release/3.2` cannot be rebuilt from `main`: 4.0 includes an irreversible
  ledger migration that 3.2 cannot read.
- Fixes that must reach production are landed on `main` first, then
  cherry-picked to `release/3.2` by the on-call engineer and released as a
  3.2.x patch. Median time from merge on `main` to release: 2 days.
- Nothing merges directly into `release/3.2` without a cherry-pick reference in
  the commit body. Branch protection enforces this.

=============== FILE: package.json ===============
{
  "name": "@acme/ledger-api",
  "version": "3.2.14",
  "private": true,
  "dependencies": {
    "express": "4.19.2",
    "pg": "8.11.5",
    "pino": "9.2.0",
    "ws": "7.5.9"
  },
  "devDependencies": {
    "@types/node": "20.14.2",
    "c8": "10.1.2",
    "eslint": "9.4.0",
    "typescript": "5.4.5"
  }
}

=============== FILE: docs/security-review-2026-q3.md ===============
# Q3 dependency review - ledger-api

Open items carried into Q4:

| Package | Installed | Advisory                                   | Fixed in | Status                        |
|---------|-----------|--------------------------------------------|----------|-------------------------------|
| `ws`    | 7.5.9     | DoS via excessive HTTP headers (high)       | 7.5.10   | not applied - no owner        |
| `pg`    | 8.11.5    | none open                                   | -        | -                             |

Notes:

- `ws` 7.5.10 is a patch on the 7.x line. It does not carry the v8 handshake
  changes that broke our proxy tests in the June spike (see spike notes in
  #4471); the proxy test failures were only ever reproduced against 8.x.
- Auditor asked in July how we evidence that the production branch receives
  vulnerability fixes. We did not have an answer written down.

=============== FILE: test/config-shape.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const CONFIG = '.github/dependabot.yml';
const read = () => fs.readFileSync(CONFIG, 'utf8');
const blocks = () => read().split(/^\s*-\s+package-ecosystem:/m).slice(1);

test('declares schema version 2', () => {
  assert.match(read(), /^version:\s*2\s*$/m);
});

test('no tab characters (YAML forbids tab indentation)', () => {
  assert.ok(!read().includes('\t'), 'file contains a tab character');
});

test('at least one update block', () => {
  assert.ok(blocks().length > 0, 'no update blocks found');
});

test('every update block declares a schedule interval', () => {
  for (const b of blocks()) assert.match(b, /\n\s+interval:\s*"?[a-z]+"?/);
});

test('every update block declares directory or directories', () => {
  for (const b of blocks()) assert.match(b, /\n\s+director(y|ies):/);
});
