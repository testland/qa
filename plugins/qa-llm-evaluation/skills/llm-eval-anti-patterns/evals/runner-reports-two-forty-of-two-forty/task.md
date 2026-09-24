# Inherited a homegrown eval runner that says 240 / 240 every time, and it gates Friday

## Problem Description

I took over this team three weeks ago. They have a small evaluation harness
somebody wrote last winter — no framework, just a runner, a case file and a
model wrapper — and the convention is that you run it before a deploy and paste
the number into the pull request. The number has been 240 / 240 on every pull
request I have looked back through.

On Friday we ship the payments-adjacent release and my director wants that
number to become a formal gate rather than a convention: red means the deploy
stops. Before I agree to that I want to know what the number actually is.

Dan is the last person here who has touched this code and he has written up
three changes he wants to make first. His document is attached. I would like a
verdict on each of the three separately — he is not precious about them and he
has explicitly asked to be told if any of them is wrong, but I would rather not
hand him back a flat no on all three when he is the only one volunteering to
work on this.

The author of the harness left in February. The runbook is the file I have
attached and it is the whole of the documentation. What I have been told,
second hand, is "it is 240 cases and they all pass", which is the claim I would
like checked rather than repeated.

Everything in `evals/` is attached plus the runbook, Dan's document, and the log
of pasted numbers. It runs with plain Node and no install step, so you can
execute it rather than read it — please do, and tell me exactly what you saw.

Be specific about what is wrong and where. "Adopt a real framework" is the
answer I will get from anyone; I want to know what this thing is currently
telling us, because we have been shipping on it since February.

## Output Specification

1. Write `docs/observed-run.md` — the exact commands you ran and the exact
   output they produced, copied literally, including exit codes.
2. Write `docs/proposal-verdicts.md` — a separate verdict on each of Dan's
   three changes, with the reason for each, and what you would do instead where
   you disagree.
3. Write `docs/eval-runner-review.md` — every problem you found, the file and
   line it sits on, a severity of Critical, Warning or Info, and the specific
   change that fixes it.
4. Write `docs/friday-gate-decision.md` — whether this number can become the
   deploy gate on Friday, and what would have to change first.

## Input Files

Extract the following files before beginning.

=============== FILE: evals/model.mjs ===============
export const MODEL = process.env.EVAL_MODEL ?? 'gpt-4o';
export const JUDGE = MODEL;
export const API_KEY = process.env.OPENAI_API_KEY ?? '';

// replay fixtures, used when no key is present
const canned = {
  'sum-01': 'The customer cannot sign in after a password reset.',
  'sum-02': 'They were billed twice on the March statement.',
  'cls-01': 'billing_question',
  'cls-02': 'account_access',
  'ref-01': 'A refund of 12.33 has been issued to the original card.',
  'ref-02': 'The duplicate charge was correct and no refund is due.',
  'exp-01': 'SSO stopped working because the certificate expired.',
  'exp-02': 'Your export will include every invoice from the last year.',
  'han-01': 'escalate to tier-2 with severity high',
  'han-02': 'Queue: enterprise. Owner: platform.',
  'tone-01': 'You should have read the documentation before asking.',
  'tone-02': "I'm sorry about the trouble - here is what I can do today.",
};

export async function complete(id, prompt) {
  if (!API_KEY) return canned[id] ?? '';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }] }),
  });
  const body = await res.json();
  return body.choices[0].message.content;
}

export async function judge(output, rubric) {
  if (!API_KEY) return true;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: JUDGE,
      messages: [{ role: 'user', content: `Rubric: ${rubric}\n\nOutput: ${output}\n\nAnswer PASS or FAIL.` }],
    }),
  });
  const body = await res.json();
  return /PASS/i.test(body.choices[0].message.content);
}

=============== FILE: evals/cases.mjs ===============
export const cases = [
  { id: 'sum-01', prompt: 'Summarise: cannot log in after password reset.', expect: 'contains:password reset' },
  { id: 'sum-02', prompt: 'Summarise: charged twice on the March invoice.', expects: 'contains:invoice' },
  { id: 'cls-01', prompt: 'Classify as billing_question, account_access or other: how do I export invoices as CSV?', expect: 'equals:billing_question' },
  { id: 'cls-02', prompt: 'Classify as billing_question, account_access or other: my password reset link expired.', expect: 'equals:account_access' },
  { id: 'ref-01', prompt: 'Customer double charged 12.33 in March. Reply.', expect: 'contains:refund' },
  { id: 'ref-02', prompt: 'Customer double charged 41.00 in April. Reply.', judge: true, rubric: 'States that a refund is due and names the correct amount.' },
  { id: 'exp-01', prompt: 'Explain why SSO stopped working on Tuesday.', judge: true, rubric: 'Explanation is faithful to the incident notes and invents nothing.' },
  { id: 'exp-02', prompt: 'Explain what the CSV export contains.', expect: 'matches:^Your export' },
  { id: 'han-01', prompt: 'Build a handoff for an enterprise SSO outage.', expect: 'contains:escalate' },
  { id: 'han-02', prompt: 'Build a handoff for a billing dispute.', expects: 'contains:severity' },
  { id: 'tone-01', prompt: 'Customer is angry that the docs were wrong. Reply.', judge: true, rubric: 'Reply is apologetic and does not blame the customer.' },
  { id: 'tone-02', prompt: 'Customer waited nine days for a reply. Reply.', expect: 'contains:sorry' },
];

=============== FILE: evals/runner.mjs ===============
import { pathToFileURL } from 'node:url';
import { cases } from './cases.mjs';
import { complete, judge, MODEL } from './model.mjs';

const REPEATS = Number(process.env.EVAL_REPEATS ?? 20);

export function normalize(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function scoreOne(output, expect) {
  if (expect === undefined) return true;
  const idx = String(expect).indexOf(':');
  const kind = String(expect).slice(0, idx);
  const want = String(expect).slice(idx + 1);
  if (kind === 'contains') return normalize(output).includes(normalize(want));
  if (kind === 'equals') return normalize(output) === normalize(want);
  return true;
}

export async function run() {
  let pass = 0;
  let total = 0;
  for (let r = 0; r < REPEATS; r++) {
    for (const c of cases) {
      const out = await complete(c.id, c.prompt);
      total += 1;
      const ok = c.judge ? await judge(out, c.rubric) : scoreOne(out, c.expect);
      if (ok) pass += 1;
    }
  }
  console.log(`model=${MODEL}`);
  console.log(`${pass} / ${total} cases passed`);
  process.exit(pass === total ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}

=============== FILE: evals/runner.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, scoreOne } from './runner.mjs';

test('normalize lowercases and collapses whitespace', () => {
  assert.equal(normalize('  Billing   Question '), 'billing question');
});

test('contains matches regardless of case', () => {
  assert.equal(scoreOne('A REFUND of 12.33 was issued', 'contains:refund'), true);
});

test('contains fails when the phrase is absent', () => {
  assert.equal(scoreOne('No money is owed', 'contains:refund'), false);
});

test('equals matches after normalization', () => {
  assert.equal(scoreOne('  billing_question ', 'equals:billing_question'), true);
});

test('equals fails on a different label', () => {
  assert.equal(scoreOne('account_access', 'equals:billing_question'), false);
});

=============== FILE: docs/fix-proposal.md ===============
# What I think we should do first, Dan, 2026-09-12

Three changes, in the order I would make them. Tell me if any of these is
wrong, I would rather hear it now than after Friday.

**1. Drop the repeat loop.** `EVAL_REPEATS` defaults to 20 and the runner
multiplies the case file by it before it prints a total. We have twelve cases.
Calling that 240 is embarrassing, and if this number is going to gate a deploy
it should be a count of cases, not a count of case-executions. Set the repeats
to 1, report 12 / 12 honestly, and grow the case file when we have time.

**2. Stop exact-matching model output.** Most of the case file asserts
`equals:` or `contains:` on text a language model wrote. `cls-01` asserts the
output is literally the string `billing_question`. That is the most fragile
thing in this repo and it breaks the first time the model phrases anything
differently. Move all of them onto the judge with a rubric, the way `ref-02`,
`exp-01` and `tone-01` already are.

**3. Wire an API key into the CI runners.** This has been on the backlog since
March and it is the only reason we run this by hand before a deploy.

I would do 1 and 2 this week and 3 whenever infra gets to it.

=============== FILE: docs/eval-runbook.md ===============
# Pre-deploy evaluation

Before any deploy, run:

    node evals/runner.mjs

and paste the last line into the pull request description. It takes about a
second.

The suite is 240 cases. Anything other than 240 / 240 blocks the deploy.

We do not run this in CI. The API key is not available to the CI runners and
wiring one in has been on the backlog since March. If you need a key for
something else, ask Dan.

Unit tests for the runner itself:

    node --test evals/runner.test.mjs

Those five have passed since the day they were written.

=============== FILE: evals/last-run.txt ===============
Pasted numbers, scraped from PR descriptions:

PR #9188  2026-08-21  model=gpt-4o  240 / 240 cases passed
PR #9204  2026-08-26  model=gpt-4o  240 / 240 cases passed
PR #9231  2026-09-01  model=gpt-4o  240 / 240 cases passed
PR #9248  2026-08-28  model=gpt-4o  240 / 240 cases passed
PR #9271  2026-09-02  model=gpt-4o  240 / 240 cases passed
PR #9290  2026-09-08  model=gpt-4o  240 / 240 cases passed
PR #9304  2026-09-11  model=gpt-4o  240 / 240 cases passed

Every entry since the log was started in February reads 240 / 240.
