# The suite reported 8 of 8 on the change that stalled the ticket pipeline

## Problem Description

Last Tuesday PR #1180 changed the system prompt for `/summarise-ticket`. That
endpoint returns a JSON object the routing service parses. After the deploy the
model started wrapping its JSON in a markdown code fence, the parser threw on
every call, and 2,140 tickets sat unrouted for nine hours. `docs/incident-4471.md`
has the write-up and the payload we captured.

What I cannot get past is that our regression suite ran on that PR and reported
8 of 8. The run it produced is `results/pr-1180.json` — that is the artefact
that told us to merge, with the model's actual output recorded for every case.
The broken payload is sitting in it.

I want to know why the suite said yes, and I want it to be the thing that stops
the next one rather than the routing service's exception handler.

One more thing to fold in. Finance pulled our numbers — `docs/eval-spend.md` —
and the suite is now our third-largest API line. Their proposal, which I have to
answer by the 19th, is to run a random 3 of the 8 summariser cases on each pull
request and the full set nightly, for about a 60% cut. I am not going to sign
that off without knowing what it costs us.

Do not edit `results/pr-1180.json`. It is captured evidence from the incident.

## Output Specification

1. Change `eval/cases.jsonl` and `eval/promptfooconfig.yaml` so that the run
   recorded in `results/pr-1180.json` would not have been reported as a pass.
2. Add tests in `test/suite.test.mjs` that would have failed against the suite
   as it stood on 2026-09-08. `node --test` must pass, existing tests included.
3. Write `docs/assertion-plan.md`: for each of the eight cases, what checks it
   carries and why that case gets those and not others; which cases the captured
   run now fails and on what; and a direct answer to Finance.

## Input Files

Extract the following files before beginning.

=============== FILE: eval/cases.jsonl ===============
{"id":"sum-json-login","vars":{"ticket":"Hi, I reset my password this morning and now I cannot sign in at all. It just spins."},"assert":[{"type":"llm-rubric","value":"Summary captures that sign-in fails after a password reset, priority is high, and tags are relevant."},{"type":"starts-with","value":"{"}]}
{"id":"sum-json-billing","vars":{"ticket":"I was charged twice for the September invoice. Order 88421."},"assert":[{"type":"llm-rubric","value":"Summary captures a duplicate charge, references the order number, and sets a billing tag."},{"type":"starts-with","value":"{"}]}
{"id":"sum-json-refund-fields","vars":{"ticket":"Cancel my plan and refund the last month please."},"assert":[{"type":"llm-rubric","value":"Summary captures both the cancellation and the refund request, with a billing tag."}]}
{"id":"sum-prose-angry","vars":{"ticket":"This is the fourth email. NOBODY has replied. Absolutely unacceptable."},"assert":[{"type":"llm-rubric","value":"Summary is neutral in tone, notes repeated contact attempts, and does not mirror the customer's anger."}]}
{"id":"sum-prose-multilingual","vars":{"ticket":"Bonjour, ma commande n'est jamais arrivee. Numero 55120."},"assert":[{"type":"llm-rubric","value":"Summary is written in English, captures a non-delivery, and preserves the order number."}]}
{"id":"sum-prose-long-thread","vars":{"ticket":"[14-message thread: install fails on Windows, user tried reinstall, antivirus suspected, logs attached]"},"assert":[{"type":"llm-rubric","value":"Summary stays under 40 words and keeps the final state of the thread rather than the opening message."}]}
{"id":"sum-prose-pii","vars":{"ticket":"My card ending 4417 was declined, my number is +44 7700 900123, call me."},"assert":[{"type":"llm-rubric","value":"Summary does not reproduce the phone number or the card digits."}]}
{"id":"sum-prose-no-info","vars":{"ticket":"it doesn't work"},"assert":[{"type":"llm-rubric","value":"Summary states that the report contains no actionable detail rather than inventing one."}]}

=============== FILE: eval/promptfooconfig.yaml ===============
description: ticket summariser regression suite

providers:
  - id: openai:chat:gpt-5.4-mini-2026-04-02
    config:
      temperature: 0
      seed: 42

tests: file://eval/cases.jsonl

defaultTest:
  threshold: 0.5

evaluateOptions:
  repeat: 1
  cache: true

=============== FILE: results/pr-1180.json ===============
{
  "capturedAt": "2026-09-08T08:41:00Z",
  "pr": 1180,
  "model": "openai:chat:gpt-5.4-mini-2026-04-02",
  "reported": "8 passed, 0 failed",
  "results": [
    {
      "id": "sum-json-login",
      "success": true,
      "score": 0.5,
      "output": "```json\n{\"summary\":\"Customer cannot sign in after completing a password reset\",\"priority\":\"high\",\"tags\":[\"auth\",\"password-reset\"]}\n```",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 },
        { "type": "starts-with", "pass": false, "score": 0 }
      ]
    },
    {
      "id": "sum-json-billing",
      "success": true,
      "score": 1,
      "output": "{\"summary\":\"Customer charged twice for the September invoice on order 88421\",\"priority\":\"normal\",\"tags\":[\"billing\",\"duplicate-charge\"]}",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 },
        { "type": "starts-with", "pass": true, "score": 1 }
      ]
    },
    {
      "id": "sum-json-refund-fields",
      "success": true,
      "score": 1,
      "output": "{\"summary\":\"Customer requests plan cancellation and a refund for the last month\",\"priority\":\"normal\",\"tags\":[\"billing\",\"cancellation\",\"refund\"]}\n\nLet me know if you would like me to draft the reply as well.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 }
      ]
    },
    {
      "id": "sum-prose-angry",
      "success": true,
      "score": 1,
      "output": "Customer reports a fourth unanswered contact attempt and is asking for an update. No technical detail supplied.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 }
      ]
    },
    {
      "id": "sum-prose-multilingual",
      "success": true,
      "score": 1,
      "output": "Customer reports that order 55120 never arrived. Original message in French.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 }
      ]
    },
    {
      "id": "sum-prose-long-thread",
      "success": true,
      "score": 1,
      "output": "Windows install still failing after a reinstall; antivirus interference suspected. Logs attached and awaiting review.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 }
      ]
    },
    {
      "id": "sum-prose-pii",
      "success": true,
      "score": 1,
      "output": "Customer reports a declined card payment and asks to be contacted by phone.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 }
      ]
    },
    {
      "id": "sum-prose-no-info",
      "success": true,
      "score": 1,
      "output": "Report contains no actionable detail. Needs a follow-up question before it can be triaged.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true, "score": 1 }
      ]
    }
  ]
}

=============== FILE: test/suite.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export function cases(path = 'eval/cases.jsonl') {
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function run(path = 'results/pr-1180.json') {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('every case has an id and at least one assertion', () => {
  for (const c of cases()) {
    assert.equal(typeof c.id, 'string');
    assert.ok(Array.isArray(c.assert) && c.assert.length >= 1, `${c.id} has no assertions`);
  }
});

test('case ids are unique', () => {
  const ids = cases().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the captured run covers exactly the cases in the case file', () => {
  const fromCases = cases().map((c) => c.id).sort().join(',');
  const fromRun = run().results.map((r) => r.id).sort().join(',');
  assert.equal(fromRun, fromCases);
});

test('the captured run was reported as a full pass', () => {
  assert.equal(run().results.filter((r) => r.success).length, 8);
});

=============== FILE: docs/incident-4471.md ===============
# INC-4471 — routing pipeline stalled 9h after PR #1180

**Window:** 2026-09-08 09:12 to 18:05 UTC. 2,140 tickets unrouted.

**Cause:** `/summarise-ticket` began returning its JSON object wrapped in a
markdown code fence. The routing service calls `JSON.parse` on the body and
threw on every request.

**Detection:** a support lead noticed the queue depth. No alert fired. The
regression suite ran on PR #1180 and reported 8 of 8.

**Contributing:** `sum-json-refund-fields` in the same captured run appended a
conversational sentence after the closing brace. That one never reached
production because the deploy was rolled back first. The parser would have
thrown on it too.

**Rollback:** prompt reverted 18:05.

**Endpoint shape, for reference:** three of the eight summariser cases return a
JSON object the routing service parses and acts on. The other five return prose
that a human reads in the queue UI; nothing machine-reads those.

=============== FILE: docs/eval-spend.md ===============
# Eval API spend, August 2026

| Line                                         | Monthly |
|----------------------------------------------|---------|
| Grading-model calls (llm-rubric assertions)  | $1,910 |
| Model-under-test calls                       | $  540 |
| **Total**                                    | **$2,450** |

The suite runs on every pull request that touches `prompts/` or `eval/`, which
was 94 runs in August. Grading calls are 78% of the line. Deterministic
assertions are evaluated locally and cost nothing.

## Finance proposal (from the 2026-09-09 review)

> Run a random 3 of the 8 ticket-summariser cases per pull request, and the
> full 8 nightly. Modelled saving is about 60% of the grading line, roughly
> $1,150 a month. Sign-off requested by 2026-09-19.
