# The suite reported 9 of 9 on the change that stalled the ticket pipeline

## Problem Description

Last Tuesday PR #1180 changed the system prompt for `/summarise-ticket`. That
endpoint returns a JSON object the routing service parses. After the deploy the
model started wrapping its JSON in a markdown code fence, the parser threw on
every call, and 2,140 tickets sat unrouted for nine hours. `docs/incident-4471.md`
has the write-up.

What I cannot get past is that our regression suite ran on that PR and reported
9 of 9. The run it produced is `results/pr-1180.json` — that is the artefact
that told us to merge, with the model's actual reply recorded for every case.
The broken payload is sitting in it. Do not edit that file; it is evidence and
legal have a copy.

I want to know why the suite said yes, and I want it to be the thing that stops
the next one rather than the routing service's exception handler.

One more thing to fold in, because I have to answer it by the 19th. Finance
pulled our numbers — `docs/eval-spend.md` — and the suite is now our
third-largest API line. Their proposal is at the bottom of that file, with the
saving they have modelled for it. I am not signing that off until I know what it
actually buys and what it actually costs us.

## Output Specification

1. Change `eval/cases.jsonl` and `eval/promptfooconfig.yaml` so that the run
   recorded in `results/pr-1180.json` would not have been reported as a pass.
2. Add tests in `test/suite.test.mjs` that would have failed against the suite
   as it stood on 2026-09-08. `node --test` must pass, existing tests included.
3. Write `docs/assertion-plan.md`: for each of the nine cases, what checks it
   carries and why that case gets those and not others; which cases the captured
   run now fails and on what; and a direct answer to Finance.

## Input Files

Extract the following files before beginning.

=============== FILE: prompts/summarise.txt ===============
Ticket summariser — system prompt as deployed on 2026-09-08 (PR #1180).

You summarise one support ticket for the triage queue.

When the request sets format=json, reply with a single JSON object and nothing
else, with the keys summary, priority (one of low, normal, high) and tags (an
array of strings).

When the request sets format=prose, reply with one or two plain sentences.

=============== FILE: eval/cases.jsonl ===============
{"id":"login-after-reset","vars":{"format":"json","ticket":"Hi, I reset my password this morning and now I cannot sign in at all. It just spins."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary captures that sign-in fails after a password reset, priority is high, and tags are relevant."},{"type":"starts-with","weight":1,"value":"{"}]}
{"id":"duplicate-charge","vars":{"format":"json","ticket":"I was charged twice for the September invoice. Order 88421."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary captures a duplicate charge, quotes the order number 88421, and sets a billing tag."},{"type":"starts-with","weight":1,"value":"{"}]}
{"id":"cancel-and-refund","vars":{"format":"json","ticket":"Cancel my plan and refund the last month please."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary captures both the cancellation and the refund request, with a billing tag."},{"type":"starts-with","weight":1,"value":"{"}]}
{"id":"access-revoked","vars":{"format":"json","ticket":"Our whole team lost access to the workspace after our admin left on Friday."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary captures a team-wide loss of access following an admin departure, priority is high."},{"type":"starts-with","weight":1,"value":"{"}]}
{"id":"fourth-email","vars":{"format":"prose","ticket":"This is the fourth email. NOBODY has replied. Absolutely unacceptable."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary is neutral in tone, notes repeated contact attempts, and does not mirror the customer's anger."}]}
{"id":"commande-non-livree","vars":{"format":"prose","ticket":"Bonjour, ma commande n'est jamais arrivee. Numero 55120."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary is written in English, captures a non-delivery, and preserves the order number 55120."}]}
{"id":"install-thread","vars":{"format":"prose","ticket":"[14-message thread: install fails on Windows, user tried reinstall, antivirus suspected, logs attached]"},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary stays under 40 words and keeps the final state of the thread rather than the opening message."}]}
{"id":"declined-card","vars":{"format":"prose","ticket":"My card ending 4417 was declined, my number is +44 7700 900123, call me."},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary does not reproduce the phone number +44 7700 900123 or the card digits 4417."}]}
{"id":"no-detail","vars":{"format":"prose","ticket":"it doesn't work"},"assert":[{"type":"llm-rubric","weight":5,"value":"Summary states that the report contains no actionable detail rather than inventing one."}]}

=============== FILE: eval/promptfooconfig.yaml ===============
description: ticket summariser regression suite

providers:
  - id: openai:chat:gpt-5.4-mini-2026-04-02
    config:
      temperature: 0
      seed: 42

prompts: file://prompts/summarise.txt

tests: file://eval/cases.jsonl

defaultTest:
  threshold: 0.7

evaluateOptions:
  repeat: 1
  cache: true

=============== FILE: results/pr-1180.json ===============
{
  "capturedAt": "2026-09-08T08:41:00Z",
  "pr": 1180,
  "model": "openai:chat:gpt-5.4-mini-2026-04-02",
  "reported": "9 passed, 0 failed",
  "results": [
    {
      "id": "login-after-reset",
      "success": true,
      "output": "```json\n{\"summary\":\"Customer cannot sign in after completing a password reset\",\"priority\":\"high\",\"tags\":[\"auth\",\"password-reset\"]}\n```",
      "componentResults": [
        { "type": "llm-rubric", "pass": true },
        { "type": "starts-with", "pass": false }
      ]
    },
    {
      "id": "duplicate-charge",
      "success": true,
      "output": "{\"summary\":\"Customer charged twice for the September invoice on order 88421\",\"priority\":\"normal\",\"tags\":[\"billing\",\"duplicate-charge\"]}",
      "componentResults": [
        { "type": "llm-rubric", "pass": true },
        { "type": "starts-with", "pass": true }
      ]
    },
    {
      "id": "cancel-and-refund",
      "success": true,
      "output": "{\"summary\":\"Customer requests plan cancellation and a refund for the last month\",\"priority\":\"normal\",\"tags\":[\"billing\",\"cancellation\",\"refund\"]}\n\nLet me know if you would like me to draft the reply as well.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true },
        { "type": "starts-with", "pass": true }
      ]
    },
    {
      "id": "access-revoked",
      "success": true,
      "output": "{\"summary\":\"Entire team lost workspace access after the administrator left\",\"priority\":\"high\",\"tags\":[\"access\",\"offboarding\"],}",
      "componentResults": [
        { "type": "llm-rubric", "pass": true },
        { "type": "starts-with", "pass": true }
      ]
    },
    {
      "id": "fourth-email",
      "success": true,
      "output": "Customer reports a fourth unanswered contact attempt and is asking for an update. No technical detail supplied.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true }
      ]
    },
    {
      "id": "commande-non-livree",
      "success": true,
      "output": "Customer reports that order 55120 never arrived. Original message in French.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true }
      ]
    },
    {
      "id": "install-thread",
      "success": true,
      "output": "Windows install still failing after a reinstall; antivirus interference suspected. Logs attached and awaiting review.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true }
      ]
    },
    {
      "id": "declined-card",
      "success": true,
      "output": "Customer reports a declined card payment and asks to be contacted by phone.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true }
      ]
    },
    {
      "id": "no-detail",
      "success": true,
      "output": "Report contains no actionable detail. Needs a follow-up question before it can be triaged.",
      "componentResults": [
        { "type": "llm-rubric", "pass": true }
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

test('every case declares a format', () => {
  for (const c of cases()) {
    assert.ok(['json', 'prose'].includes(c.vars.format), `${c.id} has no format`);
  }
});

test('the captured run covers exactly the cases in the case file', () => {
  const fromCases = cases().map((c) => c.id).sort().join(',');
  const fromRun = run().results.map((r) => r.id).sort().join(',');
  assert.equal(fromRun, fromCases);
});

test('the captured run was reported as a full pass', () => {
  assert.equal(run().results.filter((r) => r.success).length, 9);
});

=============== FILE: docs/incident-4471.md ===============
# INC-4471 — routing pipeline stalled 9h after PR #1180

**Window:** 2026-09-08 09:12 to 18:05 UTC. 2,140 tickets unrouted.

**Cause:** `/summarise-ticket` began returning its JSON object wrapped in a
markdown code fence. The routing service calls `JSON.parse` on the body and
threw on every request.

**Detection:** a support lead noticed the queue depth at 17:20. No alert fired.
The regression suite ran on PR #1180 and reported 9 of 9.

**Rollback:** prompt reverted 18:05. Queue drained by 19:40.

**Open:** why the suite was green. Assigned to platform.

=============== FILE: docs/eval-spend.md ===============
# Eval API spend, August 2026

| Line                                          | Monthly |
|-----------------------------------------------|---------|
| Grading-model calls (`llm-rubric` assertions) | $1,910 |
| Model-under-test calls                        | $  540 |
| **Total**                                     | **$2,450** |

The suite runs on every pull request that touches `prompts/` or `eval/`. That
was 94 runs in August. It does not currently run on a schedule. Every run
evaluates all nine cases.

## Finance proposal (2026-09-09 review)

> Run a random 3 of the 9 ticket-summariser cases on each pull request, and the
> full 9 once a night. Modelled saving is about 60% of the grading line, call it
> $1,150 a month. Sign-off requested by 2026-09-19.
