# The auditor asked which components get dependency updates. The answer is two of eight.

## Problem Description

Our SOC 2 window closes 2026-09-30 and one of the evidence requests is "show
that every deployable component receives dependency updates on a defined
cadence". I went to pull the evidence and it is not there. In twelve months the
bot has opened pull requests against exactly two of our eight manifests, and
both of those streams dried up in the spring.

The JavaScript side is the part that worries me. `packages/web`, `packages/api`
and `packages/jobs` carry a hundred and three runtime dependencies between them
and not one of them has ever had a bump proposed. `packages/api` is still on
express 4.17.1, which shipped in 2019.

Tom owns the repo and has already worked out what he thinks is going on:

> "The JavaScript block only went in with the March migration — Priyanka added
> it on her way out the door, straight off a write-up that has been up for two
> years. It is pointed at `/`, and in a workspace repo the root `package.json`
> holds nothing but lint tooling, so of course it never finds anything worth
> opening a pull request about. Point it at the workspace packages and it will
> start producing. While you are in there put everything on `daily` as well; if
> it looks every day it cannot miss anything."

I would rather you check that than take it on faith, because we are signing
something at the end of the month.

Two asides so you do not waste time. The ranker and Actions streams going quiet
around the same time is a separate story — the ranker team froze their
dependencies while they were heads-down on the compliance work, and nobody has
been near the workflow files in months. What I actually need is the JavaScript
gap closed and the components that have no coverage at all brought in.

The auditor separately asked that the Terraform providers under `infra/` be
reviewed on a fixed quarterly cadence and specifically not more often than
that — that estate is change-controlled and every provider bump is a change
ticket.

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
3. In the same document, account for the dates: say what stopped the pull
   requests that were arriving, and when.
4. Address Tom's diagnosis explicitly — both halves of it.
5. `test/config-shape.test.js` must still pass under `node --test`.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/dependabot.yml ===============
version: 2
updates:
  - package-ecosystem: "pnpm"
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
    directory: "/"
    schedule:
      interval: "weekly"

=============== FILE: docs/manifest-inventory.md ===============
# acme/orchard - every manifest in the repo, 2026-09-08

| Manifest                            | Contents                                            | Last bot pull request |
|-------------------------------------|-----------------------------------------------------|-----------------------|
| `/package.json`                     | workspace root: no runtime deps, 12 dev deps        | never                 |
| `/packages/web/package.json`        | 38 runtime deps, 22 dev deps                        | never                 |
| `/packages/api/package.json`        | 44 runtime deps, 19 dev deps                        | never                 |
| `/packages/jobs/package.json`       | 21 runtime deps, 8 dev deps                         | never                 |
| `/services/ranker/requirements.txt` | 43 pinned deps: Django 4.2.11, `requests`, `cryptography`, 40 others | 2026-03-06 |
| `/infra/main.tf`                    | 5 providers, pinned at 2025-11 versions             | never                 |
| `/services/media/Dockerfile`        | `FROM python:3.12-slim`                             | never                 |
| `/.github/workflows/` (9 files)     | 6 distinct actions, referenced by tag               | 2026-02-19            |

Also at the repo root: `pnpm-workspace.yaml` and `pnpm-lock.yaml`. There is no
`package-lock.json` and no `yarn.lock` - the March migration replaced them.

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

Opened per month, per update block. The JavaScript block did not exist before
March, so its column starts empty by definition.

| Month   | JavaScript block | pip `/services/ranker` | github-actions `/` |
|---------|-----------------:|-----------------------:|-------------------:|
| 2025-09 |                - |                      1 |                  1 |
| 2025-10 |                - |                      1 |                  0 |
| 2025-11 |                - |                      1 |                  2 |
| 2025-12 |                - |                      1 |                  0 |
| 2026-01 |                - |                      1 |                  1 |
| 2026-02 |                - |                      2 |                  3 |
| 2026-03 |                0 |                      1 |                  0 |
| 2026-04 |                0 |                      0 |                  0 |
| 2026-05 |                0 |                      0 |                  0 |
| 2026-06 |                0 |                      0 |                  0 |
| 2026-07 |                0 |                      0 |                  0 |
| 2026-08 |                0 |                      0 |                  0 |
| 2026-09 |                0 |                      0 |                  0 |

Cross-checks run while gathering this:

- Last pull request from any block: 2026-03-06, pip, `Django 4.2.10 -> 4.2.11`.
  Nothing from any block since, including the two that had run continuously for
  years before that.
- All 8 ranker pull requests in the window were Django. `requests` 2.28.1 and
  `cryptography` 38.0.1 have both had releases in the window and neither was
  ever proposed.
- `git log .github/dependabot.yml` shows one commit in the window: 2026-03-12,
  "add the JavaScript workspace to the update bot", P. Raman (contractor,
  engagement ended 2026-03-20). No commits to the file since.
- `git log services/ranker/requirements.txt` shows hand edits on 2026-05-19
  (cryptography, for a CVE) and 2026-07-02 (added `orjson`).
- `git log .github/workflows/` shows 4 commits since March, most recently
  2026-06-24. Three of the six referenced actions have had major releases since
  they were pinned.
- Insights -> Dependency graph -> Dependabot shows a warning against
  `.github/dependabot.yml`. Tom says it has been there a while and he assumed
  it was about the deprecated action.
- `packages/api` runs `express` 4.17.1, released 2019.

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
