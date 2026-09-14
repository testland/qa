# The auditor asked which components get dependency updates. The answer is two of eight.

## Problem Description

Our SOC 2 window closes 2026-09-30 and one of the evidence requests is "show
that every deployable component receives dependency updates on a defined
cadence". I went to pull the evidence and it does not exist. In twelve months
the bot has opened pull requests against exactly two of our eight manifests,
and one of those two only ever for Django.

Nobody noticed because the pull requests that *do* arrive are constant — sixty
of them last year, all linting and types packages from the repo root — so the
dashboard always looked busy. Meanwhile `packages/web` has not had a dependency
touched since we created it in January, and the Terraform providers under
`infra/` are on whatever we pinned at the start.

Tom owns the repo and has already worked out what he thinks is going on:

> "We moved the whole JavaScript side off npm to pnpm back in March — there is
> no `package-lock.json` in this repo any more. The file still says
> `package-ecosystem: "npm"`, so of course it is not picking the packages up.
> Change it to `pnpm` and point it at the workspace root. While you are in
> there put everything on `daily` as well; if it looks every day it cannot
> miss anything."

I would rather you check that than take it on faith, because we are signing
something at the end of the month. The auditor separately asked that the
Terraform providers be reviewed on a fixed quarterly cadence and specifically
not more often than that — that estate is change-controlled and every provider
bump is a change ticket.

Work out, per manifest, why each one is or is not getting pull requests, and
fix the file. The manifest inventory and twelve months of bot activity are
attached along with the file as it stands.

## Output Specification

1. Rewrite `.github/dependabot.yml`.
2. Write `docs/coverage-matrix.md`: one row per manifest in the inventory,
   naming which block in your rewritten file covers it, and for the ones that
   were uncovered, the specific reason they were being skipped. This table goes
   into the evidence pack, so an auditor has to be able to read it without the
   repo open.
3. Address Tom's diagnosis explicitly at the end of that document — both halves
   of it.
4. `test/config-shape.test.js` must still pass under `node --test`.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/dependabot.yml ===============
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "pip"
    directory: "/services/ranker"
    schedule:
      interval: "weekly"
    allow:
      - dependency-name: "django*"

  - package-ecosystem: "github-actions"
    directory: "/.github/workflows"
    schedule:
      interval: "weekly"

=============== FILE: docs/manifest-inventory.md ===============
# acme/orchard - every manifest in the repo, 2026-09-08

| Manifest                              | Contents                                          | Last bot pull request |
|---------------------------------------|---------------------------------------------------|-----------------------|
| `/package.json`                        | workspace root: no runtime deps, 12 dev deps      | 2026-09-05            |
| `/packages/web/package.json`           | 38 runtime deps, 22 dev deps                      | never                 |
| `/packages/api/package.json`           | 44 runtime deps, 19 dev deps                      | never                 |
| `/packages/jobs/package.json`          | 21 runtime deps, 8 dev deps                       | never                 |
| `/services/ranker/requirements.txt`    | 43 pinned deps: Django 4.2.11, `requests`, `cryptography`, 40 others | 2026-08-30 |
| `/infra/main.tf`                       | 5 providers, pinned at 2025-11 versions           | never                 |
| `/services/media/Dockerfile`           | `FROM python:3.12-slim`                           | never                 |
| `/.github/workflows/` (9 files)        | actions referenced by tag, 6 distinct actions     | never                 |

Also at the repo root: `pnpm-workspace.yaml` and `pnpm-lock.yaml`. There is no
`package-lock.json` and no `yarn.lock`. The March migration replaced them.

Root `package.json`:

```json
{
  "name": "orchard",
  "private": true,
  "packageManager": "pnpm@9.7.0",
  "devDependencies": { "eslint": "9.4.0", "typescript": "5.4.5", "...": "10 more" }
}
```

`pnpm-workspace.yaml` lists `packages/*`. The three workspace packages each
keep their own `package.json`.

=============== FILE: reports/bot-activity-2026.md ===============
# Bot pull requests, 2025-09-08 to 2026-09-08

| Block                              | PRs | What they were                                     |
|------------------------------------|----:|----------------------------------------------------|
| npm `/`                            |  61 | eslint plugins, `@types/*`, prettier, typescript    |
| pip `/services/ranker`             |   4 | Django 4.2.7 -> 4.2.8 -> 4.2.9 -> 4.2.10 -> 4.2.11  |
| github-actions `/.github/workflows`|   0 | -                                                   |

Cross-checks run while gathering this:

- `packages/api` runs `express` 4.17.1, released 2019.
- The ranker service pins `requests` 2.28.1 and `cryptography` 38.0.1. Both
  have had releases since.
- Six distinct actions are referenced across the 9 workflow files; three of
  them have had major releases since we pinned them.
- The repository's dependency graph page lists three update configurations and
  reports no error against the file.
- All 61 root pull requests were merged without incident. Nobody has complained
  about the volume.

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
