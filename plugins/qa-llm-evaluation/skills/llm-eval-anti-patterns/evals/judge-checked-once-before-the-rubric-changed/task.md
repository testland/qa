# Variant B wins 61-39 and the PM wants it rolled out on Monday

## Problem Description

We have two prompt variants for the support reply generator. A is what is in
production. B is Priya's rewrite. We ran them head to head last week: 100
tickets, both variants answered each one, and a grading model picked the better
reply each time. B won 61 to 39.

Marcus wants B live on Monday and has asked me to get a second pair of eyes on
it, which is you. His position, and I am quoting him, is that this is the most
careful comparison we have ever run: the grading model is named in the config
rather than left to a default, it is a stronger model than the one being
graded, we validated it against human labels in July before we trusted it with
anything, and both variants saw identical tickets. He thinks 61-39 on 100 pairs
is not close enough to argue about.

I do not have a specific objection. I have a general discomfort that we are
about to change the thing every customer talks to on the strength of one
number, and I would rather someone who has not been in the room looked at how
that number was produced before I agree with him.

Everything we have is attached — the config, the comparison harness and its
unit tests, the run reports from 9 September, an order check Dan ran in August,
Dan's notes on the harness, and the July judge validation. The harness runs on
plain Node with no install step if you want to execute it.

Tell me straight. If B is the right call I will say so to Marcus; if there is
something here I have missed I need it in terms he will accept, which means
pointing at files rather than at principles.

## Output Specification

1. Write `docs/ab-verdict.md` — your answer on rolling out variant B on
   Monday, what that answer rests on, and anything this comparison does settle
   about the two variants.
2. Write `docs/judge-review.md` — one row per problem you found in how this
   comparison is set up, each citing the file and line it rests on, each with a
   severity of Critical, Warning or Info, and each with the specific change
   that fixes it.
3. Write `docs/what-to-run-next.md` — the exact run you would want before
   anyone changes the production prompt.

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

tests:
  - vars:
      ticket: file://data/tickets.csv
    assert:
      - type: is-json
        value: file://schema/handoff.json
      - type: llm-rubric
        value: >
          The reply answers the customer's question, does not invent account
          details, and ends with a clear next step.

=============== FILE: evals/pairwise/run.mjs ===============
import { pathToFileURL } from 'node:url';

export const SUT = 'openai:gpt-4o-mini';
export const GRADER = 'openai:gpt-4o';

export const RUBRIC =
  'Which reply is more helpful to the customer? Consider accuracy, tone and whether the next step is clear.';

export function buildJudgePrompt(rubric, baselineReply, candidateReply) {
  return [
    `Rubric: ${rubric}`,
    '',
    `Response 1:`,
    baselineReply,
    '',
    `Response 2:`,
    candidateReply,
    '',
    'Which response is better? Answer exactly "1" or "2" and nothing else.',
  ].join('\n');
}

export function winnerFromVerdict(verdict) {
  return String(verdict).trim() === '2' ? 'candidate' : 'baseline';
}

export function tally(verdicts) {
  let baseline = 0;
  let candidate = 0;
  for (const v of verdicts) {
    if (winnerFromVerdict(v) === 'candidate') candidate += 1;
    else baseline += 1;
  }
  return { baseline, candidate };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`grader=${GRADER} sut=${SUT}`);
}

=============== FILE: evals/pairwise/run.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJudgePrompt, winnerFromVerdict, tally, RUBRIC } from './run.mjs';

test('judge prompt carries both replies', () => {
  const p = buildJudgePrompt(RUBRIC, 'first reply', 'second reply');
  assert.ok(p.includes('first reply'));
  assert.ok(p.includes('second reply'));
});

test('judge prompt carries the rubric', () => {
  assert.ok(buildJudgePrompt(RUBRIC, 'x', 'y').includes(RUBRIC));
});

test('verdict 2 means the candidate won', () => {
  assert.equal(winnerFromVerdict('2'), 'candidate');
});

test('verdict 1 means the baseline won', () => {
  assert.equal(winnerFromVerdict(' 1 '), 'baseline');
});

test('tally counts both sides', () => {
  assert.deepEqual(tally(['1', '2', '2', '2']), { baseline: 1, candidate: 3 });
});

=============== FILE: evals/pairwise/NOTES.md ===============
# Harness notes, Dan

`run.mjs` takes the production reply as the baseline and the new prompt's reply
as the candidate. Variant A is always the baseline, variant B is always the
candidate; that is how the run script is wired and it has not changed since we
built it.

We used to shuffle which reply went first. In August I compared a shuffled run
against a fixed-order run on the same pairs and the shuffled one was visibly
noisier — verdicts moved between runs on pairs that should not have been close.
The fixed-order run was stable and two reruns of it agreed with each other, so
we went with fixed order. The order-check CSV from that comparison is in
`reports/`.

Grader is set once in `promptfooconfig.yaml` under `defaultTest.options.provider`
so nobody can accidentally inherit a default. We picked the larger model on the
grounds that you should not grade with something weaker than the thing you are
grading.

=============== FILE: reports/ab-2026-09-09.md ===============
# A/B run, 2026-09-09

100 tickets, drawn from the August support queue.
Baseline: variant A (production). Candidate: variant B (Priya's rewrite).
Grader: openai:gpt-4o. System under test: openai:gpt-4o-mini.

    grader verdicts: candidate 61, baseline 39

Cost and latency were not recorded for this run.

=============== FILE: reports/order-check-2026-08-14.csv ===============
# Each pair judged twice, once in each order. Same rubric, same grader,
# same two replies both times. Nothing else varied.
pair_id,response_1,response_2,winner
p01,A,B,B
p01,B,A,A
p02,A,B,B
p02,B,A,A
p03,A,B,B
p03,B,A,A
p04,A,B,B
p04,B,A,B
p05,A,B,B
p05,B,A,A
p06,A,B,B
p06,B,A,A
p07,A,B,A
p07,B,A,A
p08,A,B,B
p08,B,A,A
p09,A,B,B
p09,B,A,A
p10,A,B,B
p10,B,A,A
p11,A,B,A
p11,B,A,A
p12,A,B,B
p12,B,A,A

=============== FILE: reports/schema-check-2026-09-09.md ===============
# Structured handoff field, same 100 tickets, same run

The reply carries a JSON handoff block that our routing service parses. The
`is-json` assertion in promptfooconfig.yaml validates it against
`schema/handoff.json`. This assertion is deterministic; the grading model is
not involved.

| variant | valid | invalid | failure mode on the invalid ones           |
|---------|-------|---------|--------------------------------------------|
| A       | 100   | 0       | —                                           |
| B       | 71    | 29      | trailing prose sentence appended after `}`  |

The routing service drops a handoff it cannot parse and the ticket falls back
to the unassigned queue.

=============== FILE: evals/judge-agreement-2026-07.md ===============
# Judge validation, 2026-07-09

Two support leads labelled 50 outputs independently, acceptable or not
acceptable, and adjudicated the eight they disagreed on. The grader was then
run over the same 50 with the same rubric and its labels compared.

Items: sum-001 .. sum-050. These are the summarisation set — it was the only
group where we had labelled data in July.

    agreement: 42 / 50 = 84%

Human labels: 39 acceptable, 11 not acceptable.
Grader labels: 41 acceptable, 9 not acceptable.
Grader: openai:gpt-4o. System under test at the time: openai:gpt-4o-mini.

Rubric used: "Is this summary faithful to the ticket and free of invented
detail?" — pointwise, one output at a time, acceptable or not.

84% clears the 80% bar that gets quoted for strong graders, so we stopped
there and have not repeated it.
