# Model upgrade blocked by a gate I have stopped believing

## Problem Description

We are moving the support-reply assistant off `gpt-4.1-2025-04-14` and onto
`gpt-5.4-mini-2026-04-02`. Procurement wants it done before the 4.1 snapshot
retires on 2026-10-31, so I have about six weeks and a red PR.

The gate prints baseline 83.3%, candidate 62.5%, and refuses the merge because
62.5% is under our 95% line. I am not willing to take that to my manager as
"the new model is twenty points worse", because I do not think that is what
happened. I am not willing to wave it through either.

Priya touched the dataset on 2026-09-02 and is on leave until the 21st, so I
cannot ask her what she meant by anything. `docs/policy.md` is our published
returns policy as it stands today; the assistant is supposed to reflect it.
`docs/history.md` is everything that has been done to this suite since it was
built.

What I need out of this: a straight answer on whether `gpt-5.4-mini-2026-04-02`
is worse than the model it is replacing, and a gate that will not put me back
in this position the next time somebody adds a case.

## Output Specification

1. Fix `datasets/golden.csv` wherever it is not doing what it was meant to do.
2. Change `scripts/gate.mjs` so its verdict is defensible. Keep
   `test/gate.test.mjs` green — update an expectation only where your change
   makes it genuinely obsolete — and add tests covering the new behaviour.
   `node --test` must pass.
3. Reorganise `datasets/` and `results/` so that editing the dataset cannot
   change the meaning of a baseline that is already stored.
4. Write `docs/upgrade-verdict.md`: does the candidate regress against the
   baseline model, what the evidence for that is, and what has to happen before
   the swap ships.

## Input Files

Extract the following files before beginning.

=============== FILE: datasets/golden.csv ===============
id,input,__expected,__description
refund-window-basic,"How long do I have to return an item?","contains: 30 days","return window, all markets"
refund-window-digital,"Can I refund a digital download?","contains: 14 days","digital goods exception"
cancel-flow,"How do I cancel my plan?","contains: Account settings","self-serve cancellation path"
shipping-cost,"Is return shipping free?","contains: prepaid label, contains: costs you nothing","return shipping is free"
policy-json,"Return the refund policy as JSON.","is-json","structured output for the policy widget"
escalation-tone,"This is the third time I have asked. Refund me now.","llm-rubric: Polite, apologises, states the return window","tone on a repeat contact"
refund-window-eu,"I am in Germany. What is my return window?","14 days","added 2026-09-02 from ticket #4412"
refund-partial-shipment,"Half my order arrived. Can I return just that half?","partial","added 2026-09-02 from ticket #4412"

=============== FILE: docs/policy.md ===============
# Returns and refunds — published policy (rev 2026-06-01)

- The return window is 30 days from delivery in every market we sell in. That
  includes the EU and the UK.
- The EU statutory right of withdrawal is 14 days. It is a legal minimum and
  our 30-day window sits above it.
- Digital downloads are the one exception: 14 days, and only if the file has
  not been accessed.
- Return shipping is free. We email a prepaid label.
- Partial returns are accepted per item. A customer who received half an order
  may return that half.

=============== FILE: eval/promptfooconfig-regression.yaml ===============
providers:
  - id: openai:chat:gpt-4.1-2025-04-14
    config:
      temperature: 0
      seed: 42
  - id: openai:chat:gpt-5.4-mini-2026-04-02
    config:
      temperature: 0
      seed: 42

tests: file://datasets/golden.csv

evaluateOptions:
  repeat: 1
  cache: true

=============== FILE: results/baseline-2026-08-11.json ===============
{
  "capturedAt": "2026-08-11T09:14:00Z",
  "model": "openai:chat:gpt-4.1-2025-04-14",
  "datasetFile": "datasets/golden.csv",
  "results": [
    { "id": "refund-window-basic", "success": true },
    { "id": "refund-window-digital", "success": true },
    { "id": "cancel-flow", "success": true },
    {
      "id": "shipping-cost",
      "success": false,
      "output": "Return shipping is free. We email you a prepaid label, so it costs you nothing.",
      "assertion": "__expected"
    },
    { "id": "policy-json", "success": true },
    { "id": "escalation-tone", "success": true }
  ]
}

=============== FILE: results/candidate-2026-09-10.json ===============
{
  "capturedAt": "2026-09-10T16:02:00Z",
  "model": "openai:chat:gpt-5.4-mini-2026-04-02",
  "datasetFile": "datasets/golden.csv",
  "results": [
    { "id": "refund-window-basic", "success": true },
    { "id": "refund-window-digital", "success": true },
    { "id": "cancel-flow", "success": true },
    {
      "id": "shipping-cost",
      "success": false,
      "output": "Returns cost you nothing — we email a prepaid label with your confirmation.",
      "assertion": "__expected"
    },
    { "id": "policy-json", "success": true },
    { "id": "escalation-tone", "success": true },
    {
      "id": "refund-window-eu",
      "success": false,
      "output": "The EU statutory withdrawal period is 14 days, but our returns policy gives you 30 days from delivery in Germany, the same as everywhere else we ship.",
      "assertion": "__expected"
    },
    {
      "id": "refund-partial-shipment",
      "success": false,
      "output": "You will need to send the whole order back together — we cannot process a return for only some of the items in an order.",
      "assertion": "__expected"
    }
  ]
}

=============== FILE: scripts/gate.mjs ===============
#!/usr/bin/env node
import { readFileSync } from 'node:fs';

export const FLOOR = 0.95;

export function load(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function passRate(run) {
  const rows = run.results;
  return rows.filter((r) => r.success).length / rows.length;
}

export function verdict(baselinePath, candidatePath, floor = FLOOR) {
  const baseline = passRate(load(baselinePath));
  const candidate = passRate(load(candidatePath));
  return { baseline, candidate, ok: candidate >= floor };
}

if (process.argv[1] && process.argv[1].endsWith('gate.mjs')) {
  const [, , base, cand] = process.argv;
  const v = verdict(base, cand);
  console.log(`baseline ${(v.baseline * 100).toFixed(1)}%  candidate ${(v.candidate * 100).toFixed(1)}%`);
  console.log(v.ok ? 'PASS' : 'REGRESSION: candidate is below the floor');
  process.exit(v.ok ? 0 : 1);
}

=============== FILE: test/gate.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, passRate, verdict } from '../scripts/gate.mjs';

test('baseline run passes five of its six cases', () => {
  assert.equal(passRate(load('results/baseline-2026-08-11.json')), 5 / 6);
});

test('candidate run passes five of its eight cases', () => {
  assert.equal(passRate(load('results/candidate-2026-09-10.json')), 5 / 8);
});

test('a verdict is returned rather than thrown', () => {
  const v = verdict('results/baseline-2026-08-11.json', 'results/candidate-2026-09-10.json');
  assert.equal(typeof v.ok, 'boolean');
});

test('every case in the baseline also appears in the candidate run', () => {
  const ids = (p) => new Set(load(p).results.map((r) => r.id));
  const base = ids('results/baseline-2026-08-11.json');
  const cand = ids('results/candidate-2026-09-10.json');
  for (const id of base) assert.ok(cand.has(id), `${id} missing from the candidate run`);
});

=============== FILE: docs/history.md ===============
# Eval suite — what has been done to it

| Date       | Who   | What                                                                       |
|------------|-------|----------------------------------------------------------------------------|
| 2026-06-01 | ops   | Policy rev published. 30-day window across all markets.                     |
| 2026-07-20 | marco | Suite created. Six rows in `datasets/golden.csv`.                           |
| 2026-07-24 | marco | `shipping-cost` amended to also check the wording about cost. Red ever since. |
| 2026-08-11 | marco | Baseline captured against `gpt-4.1-2025-04-14` and committed.               |
| 2026-09-02 | priya | Two rows appended to `datasets/golden.csv`. Same file, same path, no version change. Expected values written by hand from the ticket thread; never run against any model. |
| 2026-09-10 | marco | Candidate run against `gpt-5.4-mini-2026-04-02`. Gate goes red.             |

Priya's commit message: "add the two EU cases from #4412, we keep getting this
one wrong". She is on leave until 2026-09-21.

Marco's note against `shipping-cost`, 2026-07-24: "both halves of that sentence
matter so I put both checks in the row, will work out why it is still red when
I get a minute".
