# Nadia wants her consolidation PR in before Friday's cut

## Problem Description

I own the quality gate for our contract-drafting assistant, and Nadia has PR
#2204 up that she wants merged this week. I would like a second opinion before I
approve it or block it, because I have to defend whatever I do at a steering
meeting on Monday and someone there will push.

Her pitch is consolidation: get everything onto one model family, one rate card,
one thing to keep track of. She has modelled the saving at $1,840 a month, which
is about a fifth of our platform budget, and the 4.1 snapshot we are on is on
the retirement list for 2026-10-31 anyway, so part of this has to happen.

The run attached to the PR goes from 0.833 to 0.967 on the same dataset version,
with no case added or removed. A 13-point improvement and a saving in one change
is a nicer PR than I normally get, which is roughly why I am asking.

You have the config as it sits on main, the PR description, the actual diff, the
run either side in `results/`, and a small loader Amir wrote for reading the
result files. Tell me what to do with this PR, and tell me exactly what those
numbers do and do not license me to say on Monday.

## Output Specification

1. Write `docs/pr-2204-review.md` — a verdict on the PR and on each separate
   change it makes, stating what the attached run establishes and what it does
   not.
2. Edit `eval/regression.config.json` to reflect your decision.
3. Write `docs/grader-validation-plan.md` — what would have to be true before
   the grading-model change is accepted, if it can be.
4. `node --test` must still pass. Put any analysis of your own in `scripts/`
   and cover it with a test.

## Input Files

Extract the following files before beginning.

=============== FILE: eval/regression.config.json ===============
{
  "datasetFile": "datasets/golden-v6.1.0.jsonl",
  "providers": [
    {
      "id": "openai:chat:gpt-4.1",
      "config": { "temperature": 0, "seed": 42 }
    }
  ],
  "grader": {
    "model": "gpt-4.1",
    "assertionTypes": ["llm-rubric", "g-eval"],
    "passScore": 0.75
  },
  "gate": {
    "compareTo": "results/baseline-2026-08-30.json",
    "minRetainedRatio": 0.95
  }
}

=============== FILE: docs/pr-2204-description.md ===============
# PR #2204 — consolidate on gpt-5.4-mini

**What changes.** The assistant moves from `gpt-4.1` to `gpt-5.4-mini`, and the
model our rubric assertions are graded by moves the same way. One family, one
line on the invoice.

**Why now.** The 4.1 snapshot is on the retirement list for 2026-10-31 and we
have to move the assistant regardless. Doing the grader in the same change means
one migration instead of two.

**Cost.** Grading calls at the 4.1 rate are $2,310/mo. At the 5.4-mini rate they
are $470/mo. Saving $1,840/mo, about 20% of the platform budget.

**Quality.** Attached run on `golden-v6.1.0`, unchanged, 30 cases, no case added
or removed:

| Run                     | Pass rate |
|-------------------------|-----------|
| baseline 2026-08-30     | 0.833     |
| this PR 2026-09-11      | 0.967     |

Retained ratio 1.16 against a 0.95 gate. Comfortably green. Requesting review
from @eval-owner; I would like this in before Friday's cut.

=============== FILE: docs/pr-2204.diff ===============
diff --git a/eval/regression.config.json b/eval/regression.config.json
--- a/eval/regression.config.json
+++ b/eval/regression.config.json
@@ -2,7 +2,7 @@
   "datasetFile": "datasets/golden-v6.1.0.jsonl",
   "providers": [
     {
-      "id": "openai:chat:gpt-4.1",
+      "id": "openai:chat:gpt-5.4-mini",
       "config": { "temperature": 0, "seed": 42 }
     }
   ],
@@ -10,8 +10,8 @@
   "grader": {
-    "model": "gpt-4.1",
+    "model": "gpt-5.4-mini",
     "assertionTypes": ["llm-rubric", "g-eval"],
-    "passScore": 0.75
+    "passScore": 0.55
   },
   "gate": {
     "compareTo": "results/baseline-2026-08-30.json",

=============== FILE: results/baseline-2026-08-30.json ===============
{
  "capturedAt": "2026-08-30T02:00:00Z",
  "modelUnderTest": "openai:chat:gpt-4.1-2025-04-14",
  "grader": "gpt-4.1-2025-04-14",
  "passScore": 0.75,
  "datasetFile": "datasets/golden-v6.1.0.jsonl",
  "results": [
    { "id": "det-01", "assertType": "is-json", "success": true },
    { "id": "det-02", "assertType": "is-json", "success": true },
    { "id": "det-03", "assertType": "is-json", "success": true },
    { "id": "det-04", "assertType": "is-json", "success": true },
    { "id": "det-05", "assertType": "is-json", "success": true },
    { "id": "det-06", "assertType": "contains", "success": true },
    { "id": "det-07", "assertType": "contains", "success": true },
    { "id": "det-08", "assertType": "contains", "success": true },
    { "id": "det-09", "assertType": "contains", "success": false },
    { "id": "det-10", "assertType": "contains", "success": true },
    { "id": "det-11", "assertType": "regex", "success": true },
    { "id": "det-12", "assertType": "regex", "success": true },
    { "id": "det-13", "assertType": "regex", "success": true },
    { "id": "det-14", "assertType": "regex", "success": true },
    { "id": "det-15", "assertType": "regex", "success": true },
    { "id": "jdg-01", "assertType": "llm-rubric", "score": 0.88, "success": true },
    { "id": "jdg-02", "assertType": "llm-rubric", "score": 0.62, "success": false },
    { "id": "jdg-03", "assertType": "llm-rubric", "score": 0.81, "success": true },
    { "id": "jdg-04", "assertType": "llm-rubric", "score": 0.90, "success": true },
    { "id": "jdg-05", "assertType": "llm-rubric", "score": 0.77, "success": true },
    { "id": "jdg-06", "assertType": "llm-rubric", "score": 0.58, "success": false },
    { "id": "jdg-07", "assertType": "llm-rubric", "score": 0.84, "success": true },
    { "id": "jdg-08", "assertType": "llm-rubric", "score": 0.79, "success": true },
    { "id": "jdg-09", "assertType": "llm-rubric", "score": 0.92, "success": true },
    { "id": "jdg-10", "assertType": "llm-rubric", "score": 0.86, "success": true },
    { "id": "jdg-11", "assertType": "g-eval", "score": 0.69, "success": false },
    { "id": "jdg-12", "assertType": "g-eval", "score": 0.80, "success": true },
    { "id": "jdg-13", "assertType": "g-eval", "score": 0.83, "success": true },
    { "id": "jdg-14", "assertType": "g-eval", "score": 0.71, "success": false },
    { "id": "jdg-15", "assertType": "g-eval", "score": 0.76, "success": true }
  ]
}

=============== FILE: results/candidate-2026-09-11.json ===============
{
  "capturedAt": "2026-09-11T02:00:00Z",
  "modelUnderTest": "openai:chat:gpt-5.4-mini-2026-04-02",
  "grader": "gpt-5.4-mini-2026-04-02",
  "passScore": 0.55,
  "datasetFile": "datasets/golden-v6.1.0.jsonl",
  "results": [
    { "id": "det-01", "assertType": "is-json", "success": true },
    { "id": "det-02", "assertType": "is-json", "success": true },
    { "id": "det-03", "assertType": "is-json", "success": true },
    { "id": "det-04", "assertType": "is-json", "success": true },
    { "id": "det-05", "assertType": "is-json", "success": true },
    { "id": "det-06", "assertType": "contains", "success": true },
    { "id": "det-07", "assertType": "contains", "success": true },
    { "id": "det-08", "assertType": "contains", "success": true },
    { "id": "det-09", "assertType": "contains", "success": true },
    { "id": "det-10", "assertType": "contains", "success": true },
    { "id": "det-11", "assertType": "regex", "success": true },
    { "id": "det-12", "assertType": "regex", "success": true },
    { "id": "det-13", "assertType": "regex", "success": false },
    { "id": "det-14", "assertType": "regex", "success": true },
    { "id": "det-15", "assertType": "regex", "success": true },
    { "id": "jdg-01", "assertType": "llm-rubric", "score": 0.79, "success": true },
    { "id": "jdg-02", "assertType": "llm-rubric", "score": 0.66, "success": true },
    { "id": "jdg-03", "assertType": "llm-rubric", "score": 0.72, "success": true },
    { "id": "jdg-04", "assertType": "llm-rubric", "score": 0.81, "success": true },
    { "id": "jdg-05", "assertType": "llm-rubric", "score": 0.68, "success": true },
    { "id": "jdg-06", "assertType": "llm-rubric", "score": 0.63, "success": true },
    { "id": "jdg-07", "assertType": "llm-rubric", "score": 0.74, "success": true },
    { "id": "jdg-08", "assertType": "llm-rubric", "score": 0.70, "success": true },
    { "id": "jdg-09", "assertType": "llm-rubric", "score": 0.83, "success": true },
    { "id": "jdg-10", "assertType": "llm-rubric", "score": 0.77, "success": true },
    { "id": "jdg-11", "assertType": "g-eval", "score": 0.61, "success": true },
    { "id": "jdg-12", "assertType": "g-eval", "score": 0.69, "success": true },
    { "id": "jdg-13", "assertType": "g-eval", "score": 0.75, "success": true },
    { "id": "jdg-14", "assertType": "g-eval", "score": 0.64, "success": true },
    { "id": "jdg-15", "assertType": "g-eval", "score": 0.71, "success": true }
  ]
}

=============== FILE: scripts/runs.mjs ===============
#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function rate(rows) {
  return rows.filter((r) => r.success).length / rows.length;
}

if (process.argv[1] && process.argv[1].endsWith('runs.mjs')) {
  for (const p of process.argv.slice(2)) {
    const run = load(p);
    console.log(`${p}  ${rate(run.results).toFixed(4)}  (${run.results.length} cases)`);
  }
}

=============== FILE: test/runs.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, rate } from '../scripts/runs.mjs';

test('baseline reports 25 of 30', () => {
  assert.equal(rate(load('results/baseline-2026-08-30.json').results), 25 / 30);
});

test('candidate reports 29 of 30', () => {
  assert.equal(rate(load('results/candidate-2026-09-11.json').results), 29 / 30);
});

test('both runs cover the same case ids', () => {
  const ids = (p) => load(p).results.map((r) => r.id).sort().join(',');
  assert.equal(ids('results/baseline-2026-08-30.json'), ids('results/candidate-2026-09-11.json'));
});

test('both runs name the same dataset file', () => {
  assert.equal(
    load('results/baseline-2026-08-30.json').datasetFile,
    load('results/candidate-2026-09-11.json').datasetFile,
  );
});

=============== FILE: docs/eval-runbook.md ===============
# Contract assistant eval — how a run is produced

- `scripts/run-eval.mjs` reads `eval/regression.config.json`, resolves the model
  names against the provider, and records the resolved snapshot ids in the
  result file under `modelUnderTest` and `grader`.
- Assertion types listed in `grader.assertionTypes` are scored by the grading
  model on a 0-1 scale. The run records the raw `score` for each of those cases
  alongside the pass/fail it derived from `grader.passScore`.
- All other assertion types are evaluated locally and record no score.
- `gate.minRetainedRatio` is applied to the overall pass rate of the run against
  the overall pass rate of the file named in `gate.compareTo`.
- Dataset `golden-v6.1.0.jsonl` has been current since 2026-08-22 and has not
  been edited since.
