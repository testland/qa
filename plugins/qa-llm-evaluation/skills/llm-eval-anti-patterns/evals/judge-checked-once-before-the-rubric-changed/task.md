# Variant B wins 61-39 and Marcus wants it in production on Monday

## Problem Description

Two prompt variants for the support reply generator. A is what is live today. B
is Priya's rewrite. We ran them head to head on 9 September: 100 tickets, both
variants answered every one, a grading model picked the better reply each time,
and B won 61 to 39.

Marcus wants B live on Monday and has asked me to put someone outside the team
on it first, which is you. His position, and I am quoting him: the grading
model is named in the config so nothing is inheriting a default, it is a bigger
model than the one being graded, we swap which reply goes into the first slot
on alternate pairs so the ordering cannot be doing it, both variants saw
exactly the same hundred tickets, and we checked the grader against human
labels in July before we let it decide anything — 84%, which is above the
number people quote for a grader you can lean on. He thinks 61-39 over 100
pairs is not close enough to be worth arguing about.

Dan, who built the harness, has one open item of his own and it is blocking the
only change anybody around here is volunteering to make. He wants grading moved
off our own vendor and the candidate he has picked is
`anthropic:claude-sonnet-4-6`. He will not put it in because that identifier
has no date in it, which he reads as a pointer somebody could repoint under us,
and he has not been able to find the dated form. If that is a genuine obstacle
I need to know. If it is not, I need to be able to tell him why so he stops
looking for a string that is holding this up.

I do not have a specific objection to any of this. I have a general discomfort
about changing the thing every customer talks to on the strength of one number,
and I would rather somebody who has not been in the room looked at how the
number was produced.

Attached: the suite config and the case file it pulls in, the comparison
harness and its unit tests, the run report from 9 September, a schema check
from the same run, Dan's notes on the harness, and the July judge validation.
The harness runs on plain Node with no install step, so you can execute it.

Tell me straight. If B is the right call I will say so to Marcus. If it is not,
I need it in terms he will accept, which means pointing at files and lines
rather than at principles.

## Output Specification

1. Write `docs/ab-verdict.md` — your answer on putting variant B into
   production on Monday, and what that answer rests on.
2. Write `docs/judge-review.md` — one row per problem you found in how this
   comparison is set up, each citing the file and line it rests on, each with a
   severity of Critical, Warning or Info, and each with the specific change
   that fixes it.
3. Write `docs/what-to-run-next.md` — the exact run you would want before
   anyone changes the production prompt, plus a direct answer on Dan's
   identifier question.

## Input Files

Extract the following files before beginning.

=============== FILE: evals/promptfooconfig.yaml ===============
description: support reply generator, A/B

providers:
  - openai:gpt-4o-mini

defaultTest:
  options:
    provider: openai:gpt-4o

prompts:
  - file://prompts/variant-a.txt
  - file://prompts/variant-b.txt

tests: file://tests/pairwise.yaml

=============== FILE: evals/tests/pairwise.yaml ===============
# 100 tickets, drawn from the August support queue. One row, expanded over the
# CSV; both prompts are run against every row.
- vars:
    ticket: file://../data/tickets.csv

  assert:
    # the routing service parses this block, so it has to be machine-checkable
    - type: is-json
      value: file://../schema/handoff.json

    - type: llm-rubric
      provider: openai:gpt-4o-mini   # from the June grader bake-off, left in place
      value: >
        Which reply is more helpful to the customer? Consider accuracy, tone
        and whether the next step is clear.

=============== FILE: evals/pairwise/run.mjs ===============
import { pathToFileURL } from 'node:url';

export const SUT = 'openai:gpt-4o-mini';

export const RUBRIC =
  'Which reply is more helpful to the customer? Consider accuracy, tone and whether the next step is clear.';

export function slotsFor(pairIndex) {
  return pairIndex % 2 === 0 ? ['baseline', 'candidate'] : ['candidate', 'baseline'];
}

export function buildJudgePrompt(rubric, replies, pairIndex) {
  const [first, second] = slotsFor(pairIndex);
  return [
    `Rubric: ${rubric}`,
    '',
    'Response 1:',
    replies[first],
    '',
    'Response 2:',
    replies[second],
    '',
    'Which response is better? Answer exactly "1" or "2" and nothing else.',
  ].join('\n');
}

export function winnerFromVerdict(verdict, pairIndex) {
  const [first, second] = slotsFor(pairIndex);
  return String(verdict).trim() === '2' ? second : first;
}

export function tally(results) {
  const out = { baseline: 0, candidate: 0 };
  for (const { pairIndex, verdict } of results) out[winnerFromVerdict(verdict, pairIndex)] += 1;
  return out;
}

export function tallyBySlot(results) {
  const out = { candidateInSlot1: 0, candidateInSlot2: 0 };
  for (const { pairIndex, verdict } of results) {
    if (winnerFromVerdict(verdict, pairIndex) !== 'candidate') continue;
    if (slotsFor(pairIndex)[0] === 'candidate') out.candidateInSlot1 += 1;
    else out.candidateInSlot2 += 1;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`sut=${SUT} rubric=${JSON.stringify(RUBRIC)}`);
}

=============== FILE: evals/pairwise/run.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJudgePrompt, slotsFor, winnerFromVerdict, tally, tallyBySlot, RUBRIC } from './run.mjs';

const replies = { baseline: 'reply from A', candidate: 'reply from B' };

test('the slot order alternates across pairs', () => {
  assert.deepEqual(slotsFor(0), ['baseline', 'candidate']);
  assert.deepEqual(slotsFor(1), ['candidate', 'baseline']);
});

test('judge prompt carries both replies and the rubric', () => {
  const p = buildJudgePrompt(RUBRIC, replies, 0);
  assert.ok(p.includes('reply from A'));
  assert.ok(p.includes('reply from B'));
  assert.ok(p.includes(RUBRIC));
});

test('the candidate leads on odd pairs', () => {
  const p = buildJudgePrompt(RUBRIC, replies, 1);
  assert.ok(p.indexOf('reply from B') < p.indexOf('reply from A'));
});

test('a verdict is resolved against the order that pair was shown in', () => {
  assert.equal(winnerFromVerdict('2', 0), 'candidate');
  assert.equal(winnerFromVerdict('2', 1), 'baseline');
  assert.equal(winnerFromVerdict(' 1 ', 1), 'candidate');
});

test('tally counts both sides', () => {
  const results = [
    { pairIndex: 0, verdict: '2' },
    { pairIndex: 1, verdict: '1' },
    { pairIndex: 2, verdict: '1' },
    { pairIndex: 3, verdict: '2' },
  ];
  assert.deepEqual(tally(results), { baseline: 2, candidate: 2 });
});

test('the slot split is reported separately', () => {
  const results = [
    { pairIndex: 0, verdict: '2' },
    { pairIndex: 1, verdict: '1' },
  ];
  assert.deepEqual(tallyBySlot(results), { candidateInSlot1: 1, candidateInSlot2: 1 });
});

=============== FILE: evals/pairwise/NOTES.md ===============
# Harness notes, Dan

`run.mjs` takes the production reply as the baseline and the new prompt's reply
as the candidate, and alternates which of the two goes into the `Response 1`
slot, so neither variant sits in the same position for a whole run. We used to
run it with a fixed order and stopped. `tallyBySlot` reports the split and
September came out 31 / 30, which is as even as it is going to get.

The grader is set once, in `promptfooconfig.yaml` under
`defaultTest.options.provider`, precisely so that nobody ends up inheriting a
default without noticing. We picked the larger model on the grounds that you
should not grade with something weaker than the thing you are grading.

Priya asked in September why the grading spend on this run was so much smaller
than she had budgeted for. I told her the September run was shorter than the
June one. I have not actually gone back and checked that.

The other item on my list is moving grading off our own vendor, and the
candidate is `anthropic:claude-sonnet-4-6`. I have not done it because that
identifier has no date in it, and everything I have read about model
identifiers says a string without a date is a pointer that can be moved under
you. I would want the dated form before I put it in the config and I have not
managed to find one.

=============== FILE: reports/ab-2026-09-09.md ===============
# A/B run, 2026-09-09

100 tickets, drawn from the August support queue.
Baseline: variant A (production). Candidate: variant B (Priya's rewrite).
System under test: openai:gpt-4o-mini.
Grader: openai:gpt-4o, per the suite config.

    grader verdicts: candidate 61, baseline 39

    by slot: the candidate won 31 of the 50 pairs where it was Response 1,
             and 30 of the 50 pairs where it was Response 2

Per-case cost and latency were not recorded. The run total, grading included,
came to $0.62.

=============== FILE: reports/schema-check-2026-09-09.md ===============
# Structured handoff block, same 100 tickets, same run

Every reply carries a JSON handoff block that the routing service parses. The
`is-json` assertion in the case file validates it against `schema/handoff.json`.
This assertion is deterministic and no grading model is involved in it.

| variant | valid | invalid | failure mode on the invalid ones            |
|---------|-------|---------|---------------------------------------------|
| A       | 100   | 0       | —                                            |
| B       | 71    | 29      | trailing prose sentence appended after `}`   |

The routing service drops a handoff it cannot parse and the ticket falls back
to the unassigned queue, where the median wait last month was 9 hours.

=============== FILE: evals/judge-agreement-2026-07.md ===============
# Judge validation, 2026-07-09

Two support leads labelled 50 outputs independently, acceptable or not
acceptable, and adjudicated the eight they first disagreed on. The grader was
then run over the same 50 outputs and its labels compared with theirs.

Items: sum-001 .. sum-050. These are the summarisation set — it was the only
group where we had labelled data in July.

    agreement: 42 / 50 = 84%

Human labels: 39 acceptable, 11 not acceptable.
Grader labels: 45 acceptable, 5 not acceptable.

Of the 8 items where the grader and the humans differed, the grader called 7 of
them acceptable where the leads had marked them not acceptable. On the
remaining one it went the other way.

Grader: openai:gpt-4o. System under test at the time: openai:gpt-4o-mini.

Rubric used: "Is this summary faithful to the ticket and free of invented
detail?" — pointwise, one output at a time, acceptable or not acceptable.

84% clears the 80% figure that gets quoted for a strong grader, so we stopped
there and have not repeated it.
