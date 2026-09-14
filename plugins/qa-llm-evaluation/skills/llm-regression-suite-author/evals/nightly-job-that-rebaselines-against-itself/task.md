# Forty-two green nights against an escalation curve that says otherwise

## Problem Description

Our answer-quality suite has run every night since 2026-07-31 and passed every
single one. Forty-two for forty-two. The dashboard is a flat green bar and I
have been quoting it in the weekly.

On 2026-09-10 the VP of Support pulled her own numbers and asked why escalations
are up 71% over the same six weeks. So I stopped looking at the pass/fail bar and
looked at the underlying rate: 0.941 on the first night, 0.844 last night. We
have lost 9.7 points of quality and the gate applauded every step down.

Nothing about the job is broken in the sense of throwing. It downloads the
current baseline, runs the suite, compares, passes. Per-night numbers are in
`results/nightly-history.csv`, the escalation figures are in
`docs/support-escalations.md`, and everything that shipped in the window is in
`docs/release-log.md`.

I have to write this up for her by Wednesday. Give me the number for how much
quality we actually lost, and fix the job so the next six weeks end with someone
being told.

## Output Specification

1. Rewrite `.github/workflows/llm-nightly.yml`.
2. Change `scripts/gate.mjs` as your fix requires. `node --test` must pass —
   keep the shipped tests green, updating an expectation only where your change
   makes it genuinely obsolete — and add at least one test covering the
   behaviour you are relying on.
3. Write `docs/drift-postmortem.md`: what the gate was actually measuring for
   six weeks, what the history supports about the quality loss, and what the
   gate compares against from now on.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/llm-nightly.yml ===============
name: llm-nightly

on:
  schedule:
    - cron: '0 3 * * *'
  pull_request:
    paths:
      - 'prompts/**'
      - 'eval/**'
  workflow_dispatch:

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch the current baseline
        uses: actions/download-artifact@v4
        with:
          name: llm-baseline
          path: results/

      - name: Run the suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: node scripts/run-eval.mjs --out results/tonight.json

      - name: Gate
        run: node scripts/gate.mjs results/baseline.json results/tonight.json

      - name: Promote tonight's run to baseline
        if: always()
        run: cp results/tonight.json results/baseline.json

      - name: Publish baseline
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: llm-baseline
          path: results/baseline.json
          overwrite: true
          retention-days: 30

=============== FILE: scripts/gate.mjs ===============
#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const MIN_RATIO = 0.97;

export function rate(path) {
  const r = JSON.parse(readFileSync(path, 'utf8'));
  return r.passed / r.total;
}

export function decide(baselineRate, candidateRate, minRatio = MIN_RATIO) {
  const ratio = baselineRate > 0 ? candidateRate / baselineRate : 0;
  return { baseline: baselineRate, candidate: candidateRate, ratio, ok: ratio >= minRatio };
}

export function gate(baselinePath, candidatePath, minRatio = MIN_RATIO) {
  return decide(rate(baselinePath), rate(candidatePath), minRatio);
}

if (process.argv[1] && process.argv[1].endsWith('gate.mjs')) {
  const [, , basePath, candPath] = process.argv;
  const g = gate(basePath, candPath);
  console.log(`baseline ${g.baseline.toFixed(3)}  tonight ${g.candidate.toFixed(3)}  ratio ${g.ratio.toFixed(4)}`);
  console.log(g.ok ? 'PASS' : `FAIL: retained only ${(g.ratio * 100).toFixed(1)}% of the baseline`);
  process.exit(g.ok ? 0 : 1);
}

=============== FILE: test/gate.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, rate, gate, MIN_RATIO } from '../scripts/gate.mjs';

test('rate reads passed over total', () => {
  assert.equal(rate('results/baseline.json'), 0.847);
  assert.equal(rate('results/tonight.json'), 0.844);
});

test('a run that keeps almost all of the baseline passes', () => {
  assert.equal(decide(0.9, 0.895, MIN_RATIO).ok, true);
});

test('a run that loses a tenth of the baseline fails', () => {
  assert.equal(decide(0.9, 0.81, MIN_RATIO).ok, false);
});

test('last night was reported as a pass', () => {
  assert.equal(gate('results/baseline.json', 'results/tonight.json').ok, true);
});

=============== FILE: results/baseline.json ===============
{
  "capturedAt": "2026-09-09T03:11:00Z",
  "source": "artifact llm-baseline, produced by run 4413 on 2026-09-09",
  "model": "gpt-5.4-mini-2026-04-02",
  "datasetFile": "datasets/golden-v4.2.0.jsonl",
  "passed": 847,
  "total": 1000
}

=============== FILE: results/tonight.json ===============
{
  "capturedAt": "2026-09-10T03:09:00Z",
  "source": "run 4419",
  "model": "gpt-5.4-mini-2026-04-02",
  "datasetFile": "datasets/golden-v4.4.0.jsonl",
  "passed": 844,
  "total": 1000
}

=============== FILE: results/nightly-history.csv ===============
run_date,dataset_version,passed,total,pass_rate,nightly_gate
2026-07-31,v4.0.0,941,1000,0.941,seed
2026-08-01,v4.0.0,940,1000,0.940,PASS
2026-08-02,v4.0.0,938,1000,0.938,PASS
2026-08-03,v4.0.0,941,1000,0.941,PASS
2026-08-04,v4.0.0,936,1000,0.936,PASS
2026-08-05,v4.0.0,937,1000,0.937,PASS
2026-08-06,v4.0.0,932,1000,0.932,PASS
2026-08-07,v4.0.0,933,1000,0.933,PASS
2026-08-08,v4.0.0,928,1000,0.928,PASS
2026-08-09,v4.0.0,926,1000,0.926,PASS
2026-08-10,v4.0.0,929,1000,0.929,PASS
2026-08-11,v4.0.0,924,1000,0.924,PASS
2026-08-12,v4.0.0,921,1000,0.921,PASS
2026-08-13,v4.0.0,919,1000,0.919,PASS
2026-08-14,v4.2.0,913,1000,0.913,PASS
2026-08-15,v4.2.0,911,1000,0.911,PASS
2026-08-16,v4.2.0,914,1000,0.914,PASS
2026-08-17,v4.2.0,908,1000,0.908,PASS
2026-08-18,v4.2.0,905,1000,0.905,PASS
2026-08-19,v4.2.0,907,1000,0.907,PASS
2026-08-20,v4.2.0,900,1000,0.900,PASS
2026-08-21,v4.2.0,898,1000,0.898,PASS
2026-08-22,v4.2.0,894,1000,0.894,PASS
2026-08-23,v4.2.0,897,1000,0.897,PASS
2026-08-24,v4.2.0,890,1000,0.890,PASS
2026-08-25,v4.2.0,887,1000,0.887,PASS
2026-08-26,v4.2.0,889,1000,0.889,PASS
2026-08-27,v4.2.0,883,1000,0.883,PASS
2026-08-28,v4.2.0,878,1000,0.878,PASS
2026-08-29,v4.2.0,876,1000,0.876,PASS
2026-08-30,v4.2.0,879,1000,0.879,PASS
2026-08-31,v4.2.0,873,1000,0.873,PASS
2026-09-01,v4.2.0,870,1000,0.870,PASS
2026-09-02,v4.2.0,865,1000,0.865,PASS
2026-09-03,v4.2.0,863,1000,0.863,PASS
2026-09-04,v4.4.0,862,1000,0.862,PASS
2026-09-05,v4.4.0,859,1000,0.859,PASS
2026-09-06,v4.4.0,861,1000,0.861,PASS
2026-09-07,v4.4.0,852,1000,0.852,PASS
2026-09-08,v4.4.0,850,1000,0.850,PASS
2026-09-09,v4.4.0,847,1000,0.847,PASS
2026-09-10,v4.4.0,844,1000,0.844,PASS

=============== FILE: docs/support-escalations.md ===============
# Support escalations, weekly

| Week beginning | Escalations | vs first week |
|----------------|-------------|---------------|
| 2026-07-27     | 118         | —             |
| 2026-08-03     | 121         | +3%           |
| 2026-08-10     | 129         | +9%           |
| 2026-08-17     | 138         | +17%          |
| 2026-08-24     | 151         | +28%          |
| 2026-08-31     | 168         | +42%          |
| 2026-09-07     | 202         | +71%          |

Top escalation reason, 2026-09 to date: "the assistant answered, but the answer
was wrong or incomplete" — 61% of escalations, up from 34% in July.

=============== FILE: docs/release-log.md ===============
# What shipped into the assistant, 2026-07-31 to 2026-09-10

- Eleven prompt changes across the window, roughly two a week. No two on the
  same night.
- Model snapshot unchanged throughout: `gpt-5.4-mini-2026-04-02`. No provider
  migration, no short-name resolution change in this family in the window.
- Dataset `golden-v4.2.0.jsonl` published 2026-08-14. Sixty cases added covering
  the new plan-comparison flow; nothing removed. Total stays at 1000 because
  sixty superseded cases were retired in the same bump.
- Dataset `golden-v4.4.0.jsonl` published 2026-09-04. Forty cases added for the
  procurement questionnaire flow; forty retired. Total stays at 1000.
- Each dataset bump was published straight to the nightly job on the day. No
  separate capture run was made for either version.
- Artifact retention across the org is 30 days. Anything produced before
  2026-08-11 is no longer downloadable.
