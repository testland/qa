# Q3 suppression walk, and Marta wants one advisory silenced

## Problem Description

Every quarter we are supposed to walk the suppression list in
`.github/dependabot.yml` and justify each entry again. Nobody did it in Q1 or
Q2. The Q3 window closes 2026-09-30 and Marta (security) needs the walk done
and written up before then, because the write-up is what goes in the evidence
pack and an external auditor reads it in November.

Four things from her ticket, quoted as she wrote them:

1. "Anything whose re-review date has passed comes off the list."
2. "Anything with a date still in the future, leave it alone. Somebody current
   signed for it, the reason is written down next to it, and I am not reopening
   those arguments this quarter — we have three weeks."
3. "`sharp`. We went through the advisory with the imaging team and we do not
   reach the vulnerable code path; we never decode untrusted input with it.
   Silence that one advisory, and put it in the file where I can see it in a
   diff rather than buried in somebody's browser session."
4. "The `dependencies` label is useless to me. Every bot pull request in the
   repo carries it and my compliance filter comes back with three hundred rows.
   Swap it for `dep-waiver` on both blocks so I get these and nothing else."

The file, the installed-version inventory, this month's advisory summary and
the workflow that routes these pull requests are all attached.

The one thing that matters more than getting through her list is that the
write-up is accurate about what the file *does*, not what we meant it to do.
That is the entire point of walking it — the last two quarters were skipped and
nobody has read these entries against a version number since they were written.

## Output Specification

1. Update `.github/dependabot.yml`.
2. Write `docs/waiver-audit-2026-q3.md`: one section per suppression entry
   currently in the file, each with an explicit keep / rewrite / remove verdict
   and the evidence behind it; a direct answer to each of Marta's four numbered
   asks; and the date the next quarterly walk is due.
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
    open-pull-requests-limit: 10
    ignore:
      # Reason: react 19 needs the router v7 migration, scheduled for Q1 2027
      # Approved-by: alice@acme.com
      # Re-review-date: 2026-12-01
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]

      # Reason: we stay on express 4 until the router rewrite lands; express 5
      # reorders middleware and our error handler depends on the old order
      # Approved-by: marta@acme.com
      # Re-review-date: 2026-11-30
      # Ticket: PLAT-2210 (router rewrite)
      - dependency-name: "express"
        versions: ["^4.0.0"]

      # Reason: axios 1.x changes the redirect handling our checkout relies on
      # Approved-by: dmitri@acme.com
      # Re-review-date: 2025-11-01
      - dependency-name: "axios"
        versions: [">=1.0.0"]

      - dependency-name: "lodash"

      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  - package-ecosystem: "pip"
    directory: "/services/ranker"
    schedule:
      interval: "weekly"
    ignore:
      # Reason: django 5.0 drops Python 3.9 and our base image is pinned to 3.9
      # Approved-by: marta@acme.com
      # Re-review-date: 2026-10-15
      # Ticket: PLAT-2211 (base image upgrade)
      - dependency-name: "django"
        versions: [">=5.0"]

      - dependency-name: "boto3"
        update-types: ["version-update:semver-patch"]

=============== FILE: reports/dependency-inventory.md ===============
# Installed versions, 2026-09-08

| Package   | Installed | Latest on our major | Latest overall |
|-----------|-----------|---------------------|----------------|
| `react`   | 18.3.1    | 18.3.1              | 19.2.0         |
| `express` | 4.17.1    | 4.21.2              | 5.1.0          |
| `axios`   | 0.27.2    | 0.27.2              | 1.8.4          |
| `lodash`  | 4.17.20   | 4.17.21             | 4.17.21        |
| `sharp`   | 0.32.6    | 0.32.6              | 0.34.1         |
| `django`  | 4.2.16    | 4.2.23              | 5.1.6          |
| `boto3`   | 1.34.51   | 1.34.162            | 1.40.7         |

Roster and provenance, gathered for the audit:

- `alice@acme.com` and `marta@acme.com` are current employees.
- `dmitri@acme.com` left the company on 2025-06-30. No successor is named on
  any entry he signed.
- `git blame` dates the two unannotated npm entries to 2024-02-14 and the
  `boto3` entry to 2025-03-19. None of the three carries a ticket reference.
- PLAT-2210 (router rewrite) is open, unestimated, not on any sprint.
- PLAT-2211 (base image upgrade) is open and in the current sprint.
- `boto3` releases a patch most working days.
- No dependency in this table has been upgraded by a bot pull request since
  2025-12; everything moving has moved by hand.

=============== FILE: reports/advisories-2026-09.md ===============
# Open advisories against installed versions, 2026-09-08

| Package   | Installed | Advisory                                          | Severity | Patched versions         |
|-----------|-----------|---------------------------------------------------|----------|--------------------------|
| `express` | 4.17.1    | Open redirect via `res.location`                  | High     | `>= 4.20.0`              |
| `axios`   | 0.27.2    | Server-side request forgery via redirect handling | High     | `>= 1.8.2`               |
| `lodash`  | 4.17.20   | Command injection in `template`                   | High     | `>= 4.17.21`             |
| `sharp`   | 0.32.6    | Out-of-bounds write in the bundled decoder        | High     | `>= 0.33.5`              |
| `django`  | 4.2.16    | Denial of service in `URLValidator`               | Moderate | `>= 4.2.18`, `>= 5.0.11` |
| `react`   | 18.3.1    | none open                                         | -        | -                        |
| `boto3`   | 1.34.51   | none open                                         | -        | -                        |

On-call was paged four times this month against this list: three for `sharp`,
one for `express`.

=============== FILE: .github/workflows/dep-triage.yml ===============
name: Dependency PR triage
on:
  pull_request:
    types: [opened, reopened, labeled]

jobs:
  route:
    if: contains(github.event.pull_request.labels.*.name, 'dependencies')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Route to the review channel and stamp the compliance field
        run: ./scripts/route-dependency-pr.sh "$PR_NUMBER"
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}

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
