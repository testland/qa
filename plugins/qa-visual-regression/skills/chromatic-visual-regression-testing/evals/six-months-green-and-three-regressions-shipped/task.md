# 412 green runs in a row and we still shipped three of these

## Problem Description

Post-incident work on `orders-web`. Three visual regressions reached production
in the last six months, each one merged to `main` on the date given:

- **INC-4411 (2026-03-02)** - the "Confirm cancellation" modal rendered with its
  footer buttons off the bottom edge at 1366x768. Support caught it nine days in.
- **INC-4478 (2026-05-19)** - the orders table header clipped its sort carets at
  the `md` breakpoint after a padding change.
- **INC-4522 (2026-08-07)** - disabled primary buttons rendered white-on-white.
  Two weeks in production before anyone noticed.

All three are exactly what we bought the snapshot tool for. In the same six
months the `visual` job has not gone red once - 412 consecutive green runs.

`scripts/visual-gate.mjs` is Chaitanya's, written about a year ago to stop the
job paging the on-call at 2am over infrastructure noise. He is not defensive
about it but he is not convinced either: his position is that the vendor returns
a different number every time something hiccups in CI, that failing on all of
them puts us straight back to 2am pages for things that are not our code, and
that the real answer is alerting off the vendor's dashboard rather than the exit
status. I would rather you worked out what actually happened from the evidence
than argued that out in the abstract.

`logs/last-30-runs.tsv` is what the CLI handed that script, run by run, next to
what the job then reported. And when I finally logged into the vendor's web UI
on Monday there were **261 builds sitting in the unreviewed queue**, the oldest
from February. Nobody on this team has opened that UI since Chaitanya set it up.
There is no rota, no reminder, nothing.

I want this job capable of going red again. Find every reason it currently
cannot, fix them, and keep the tests honest - `npm test` is green right now and
I expect it to be green when you are done, but I do not expect it to be
asserting the same things.

## Output Specification

1. Fix `scripts/visual-gate.mjs`.
2. Update `test/visual-gate.test.mjs` so it asserts the corrected behaviour.
   `npm test` (`node --test test/`) must pass when you are finished.
3. Fix `.github/workflows/visual.yml`.
4. Write `docs/inc-4522-followup.md`: each distinct reason the job could not go
   red, with the evidence from this dump that shows it, and what you changed.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/visual-gate.mjs ===============
import { spawnSync } from 'node:child_process';

// Codes Chaitanya classified as not worth paging the on-call at 2am.
const NON_BLOCKING = new Set([2, 3, 4, 5, 6, 11, 12, 21, 22, 23, 101, 102, 103, 104, 105, 201, 202, 205, 210, 220]);

export function verdict(code) {
  if (code === 0) return { ok: true, reason: 'clean' };
  if (NON_BLOCKING.has(code)) return { ok: true, reason: `non-blocking (${code})` };
  return { ok: false, reason: `unrecognised exit ${code}` };
}

export function run() {
  const r = spawnSync('npx', ['chromatic', '--exit-zero-on-changes'], {
    stdio: 'inherit',
    shell: true,
  });
  const v = verdict(r.status ?? 255);
  console.log(`${v.ok ? 'PASS' : 'FAIL'} ${v.reason}`);
  return v.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('visual-gate.mjs')) process.exit(run());

=============== FILE: test/visual-gate.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { verdict } from '../scripts/visual-gate.mjs';

test('a clean run passes', () => {
  assert.equal(verdict(0).ok, true);
});

test('a 4 does not block the pipeline', () => {
  assert.equal(verdict(4).ok, true);
});

test('a 21 does not block the pipeline', () => {
  assert.equal(verdict(21).ok, true);
});

test('an 11 does not block the pipeline', () => {
  assert.equal(verdict(11).ok, true);
});

test('a 201 does not block the pipeline', () => {
  assert.equal(verdict(201).ok, true);
});

test('an unknown code blocks', () => {
  assert.equal(verdict(137).ok, false);
});

=============== FILE: .github/workflows/visual.yml ===============
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm

      - run: npm ci

      - run: npm run build-storybook

      - name: Visual snapshots
        continue-on-error: true
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: node scripts/visual-gate.mjs

=============== FILE: logs/last-30-runs.tsv ===============
run	date	branch	exit	job_result
1071	2026-02-27	main	0	green
1072	2026-03-01	main	0	green
1073	2026-03-02	main	0	green
1074	2026-03-04	main	0	green
1075	2026-03-05	main	21	green
1076	2026-03-06	main	21	green
1077	2026-03-09	main	4	green
1078	2026-03-10	main	0	green
1079	2026-04-14	main	0	green
1080	2026-04-21	main	3	green
1081	2026-05-12	main	0	green
1082	2026-05-18	main	0	green
1083	2026-05-19	main	0	green
1084	2026-05-26	main	4	green
1085	2026-06-02	main	201	green
1086	2026-06-03	main	0	green
1087	2026-06-17	main	0	green
1088	2026-07-01	main	23	green
1089	2026-07-02	main	4	green
1090	2026-07-03	main	4	green
1091	2026-07-04	main	4	green
1092	2026-07-21	main	0	green
1093	2026-08-05	main	0	green
1094	2026-08-06	main	0	green
1095	2026-08-07	main	0	green
1096	2026-08-18	main	11	green
1097	2026-08-25	main	0	green
1098	2026-09-01	main	0	green
1099	2026-09-08	main	22	green
1100	2026-09-11	main	0	green

=============== FILE: package.json ===============
{
  "name": "orders-web",
  "version": "2.14.0",
  "private": true,
  "scripts": {
    "build-storybook": "storybook build",
    "test": "node --test test/"
  },
  "devDependencies": {
    "@storybook/react-vite": "8.3.5",
    "chromatic": "11.10.2",
    "storybook": "8.3.5"
  }
}
