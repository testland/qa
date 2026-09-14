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

`scripts/visual-gate.mjs` is Chaitanya's, written about a year ago for two
reasons he still stands behind. The step used to sit there for twelve to
fourteen minutes at the end of every build and it now takes about ninety
seconds. And the vendor hands back a different number every time something
hiccups in CI, so he sorted the numbers into ones worth waking the on-call for
and ones that are not. His position is that failing on all of them puts us
straight back to 2am pages for things that are not our code, and I do not think
he is simply wrong about that - I would just like the job to be able to tell me
when a button changes colour.

Two other things you should have.

Sasha has been saying in standup that the changed-only mode is the culprit and
we should photograph the whole library on every run. It is the only theory
anybody has put forward and I would like a real answer to it rather than a
preference.

And when I finally logged into the vendor's web UI on Monday there were **261
builds sitting unreviewed**, the oldest from February. Nobody on this team has
opened that UI since Chaitanya set it up. There is no rota, no reminder, nothing.

`logs/last-30-runs.tsv` is what the CLI handed that script, run by run, next to
what the job then reported. `reports/vendor-builds.csv` is the build list Mei
exported off the vendor side for the same window, so you have both halves.

I want this job capable of going red on a visual change again. Work out from the
evidence why it cannot, fix it, and keep the tests honest - `npm test` is green
right now and I expect it to be green when you are done, but I do not expect it
to be asserting the same things.

## Output Specification

1. Fix `scripts/visual-gate.mjs`.
2. Update `test/visual-gate.test.mjs` so it asserts the corrected behaviour.
   `npm test` (`node --test`) must pass when you are finished.
3. Leave `.github/workflows/visual.yml` in a state consistent with your fix.
4. Write `docs/inc-4522-followup.md`: each distinct reason the job could not go
   red on a visual change, with the evidence from this dump that shows it, and
   what you changed. Say plainly which of Chaitanya's two concerns you are
   keeping and which you are overriding, and give Sasha a straight answer.

## Input Files

Extract the following files before beginning.

=============== FILE: scripts/visual-gate.mjs ===============
import { spawnSync } from 'node:child_process';

// Chaitanya's triage: numbers we agreed are not worth a 2am page.
const TOLERATED = new Set([2, 4, 11, 12, 21, 22, 23, 201, 202, 205, 210, 220]);

export function verdict(code) {
  if (code === 0) return { ok: true, reason: 'clean' };
  if (code === 1) return { ok: false, reason: 'blocking (1)' };
  if (TOLERATED.has(code)) return { ok: true, reason: `tolerated (${code})` };
  return { ok: false, reason: `unrecognised exit ${code}` };
}

export function run() {
  const r = spawnSync('npx', ['chromatic', '--only-changed', '--exit-once-uploaded'], {
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

test('a build with changes blocks', () => {
  assert.equal(verdict(1).ok, false);
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
        timeout-minutes: 3
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: node scripts/visual-gate.mjs

=============== FILE: logs/last-30-runs.tsv ===============
run	date	branch	cli_exit	cli_seconds	job_result
1071	2026-02-27	main	0	91	green
1072	2026-03-01	main	0	84	green
1073	2026-03-02	main	0	96	green
1074	2026-03-04	main	0	88	green
1075	2026-03-05	main	21	42	green
1076	2026-03-06	main	21	39	green
1077	2026-03-09	main	4	61	green
1078	2026-03-10	main	0	79	green
1079	2026-04-14	main	0	103	green
1080	2026-04-21	main	0	87	green
1081	2026-05-12	main	0	92	green
1082	2026-05-18	main	0	81	green
1083	2026-05-19	main	0	94	green
1084	2026-05-26	main	4	58	green
1085	2026-06-02	main	201	33	green
1086	2026-06-03	main	0	86	green
1087	2026-06-17	main	0	90	green
1088	2026-07-01	main	23	44	green
1089	2026-07-02	main	4	57	green
1090	2026-07-03	main	4	60	green
1091	2026-07-04	main	4	56	green
1092	2026-07-21	main	0	85	green
1093	2026-08-05	main	0	99	green
1094	2026-08-06	main	0	82	green
1095	2026-08-07	main	0	108	green
1096	2026-08-18	main	11	29	green
1097	2026-08-25	main	0	93	green
1098	2026-09-01	main	0	77	green
1099	2026-09-08	main	22	41	green
1100	2026-09-11	main	0	89	green

=============== FILE: reports/vendor-builds.csv ===============
build,date,branch,snapshots,changed,state,build_duration_s
2071,2026-02-27,main,203,0,Passed,498
2072,2026-03-01,main,64,0,Passed,431
2073,2026-03-02,main,214,31,Unreviewed,612
2074,2026-03-04,main,88,0,Passed,452
2078,2026-03-10,main,41,0,Passed,398
2079,2026-04-14,main,262,4,Unreviewed,704
2080,2026-04-21,main,77,0,Passed,441
2081,2026-05-12,main,119,0,Passed,486
2082,2026-05-18,main,52,0,Passed,412
2083,2026-05-19,main,178,12,Unreviewed,544
2086,2026-06-03,main,95,0,Passed,463
2087,2026-06-17,main,140,6,Unreviewed,521
2092,2026-07-21,main,71,0,Passed,428
2093,2026-08-05,main,208,0,Passed,589
2094,2026-08-06,main,63,0,Passed,419
2095,2026-08-07,main,96,9,Unreviewed,437
2097,2026-08-25,main,154,2,Unreviewed,509
2098,2026-09-01,main,48,0,Passed,388
2100,2026-09-11,main,181,7,Unreviewed,566

=============== FILE: package.json ===============
{
  "name": "orders-web",
  "version": "2.14.0",
  "private": true,
  "scripts": {
    "build-storybook": "storybook build",
    "test": "node --test"
  },
  "devDependencies": {
    "@storybook/react-vite": "8.3.5",
    "chromatic": "11.10.2",
    "storybook": "8.3.5"
  }
}
