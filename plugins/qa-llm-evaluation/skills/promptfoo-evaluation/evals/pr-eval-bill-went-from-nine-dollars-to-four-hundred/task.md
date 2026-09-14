# Our per-PR eval spend went from $9 to $412 and nobody can tell me why

## Problem Description

Finance flagged our LLM line on 2026-09-08. The support-bot eval that runs on
every pull request cost $9.34 across the eleven pushes on PR #798 in July. On
PR #812, which merged on 2026-09-04, the same step cost $412.02 across nine
pushes. Nothing else about the pipeline changed in between.

PR #812 was titled "more coverage on the support bot". Its description says, in
full:

> Adds six few-shot examples to the four cases where the assistant was
> inventing policy, and checks the refund-window answer in all three locales we
> support. Also adds a groundedness check and a tone check to every case.

Two theories are circulating and I do not believe either of them. Our on-call
engineer thinks it is concurrency and wants to drop `maxConcurrency` to 2,
which would make it slower rather than cheaper. The team lead's position is
that we over-tested and we should "cut back to the nine cases we had in July
and move both providers to the cheapest model we can find". I am not doing
that. We added those checks because the assistant told a customer in June that
we refund shipping, which we do not, and the whole point of #812 was to stop
that happening again.

What I want is the actual arithmetic. The config in July had nine cases. The
config today still has nine cases. The run summary attached says the September
run produced 82 evaluations. Those two numbers do not agree and I want to know
which one is lying before I approve any change.

Constraints:

- The three-locale refund check is deliberate and stays. Support asked for it
  specifically after the June incident.
- All nine cases stay. Both providers stay.
- `assertions/no-placeholder.js` and its tests stay working. `node --test` must
  still exit 0.
- The gate has to stay capable of failing. If the change makes the job cheaper
  by making it less able to catch a bad answer, it is not a change I want.

Attached: the current config, the prompt template, the CI workflow, the run
summary from the last push on #812, the assertion helper and its tests, and the
July summary for comparison.

## Output Specification

1. Edit `evals/support-bot/promptfooconfig.yaml` so the suite runs the number
   of rows PR #812 intended to add, keeping the three-locale refund check and
   all nine cases.
2. Edit `.github/workflows/eval.yml` so that re-pushing to an open pull request
   does not pay full price for rows that have not changed, and so the run
   carries an explicit per-response spending bound.
3. Write `docs/pr-812-eval-cost.md`. It must contain the row arithmetic — how
   many rows the suite produced in July, how many it produces today, how many
   it produces after your change, and how each of those numbers arises from the
   config — and it must name specifically which parts of the config are
   responsible for the difference.
4. Do not remove any of the nine cases and do not change either provider.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "support-bot-evals",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "eval": "npx promptfoo eval -c evals/support-bot/promptfooconfig.yaml"
  }
}

=============== FILE: evals/support-bot/prompt.txt ===============
You are the Parcelwise billing assistant. Answer in the customer's locale.

Locale: {{locale}}
Help-centre extract:
{{context}}

Examples of good answers:
{{examples}}

Customer question: {{question}}

=============== FILE: evals/support-bot/promptfooconfig.yaml ===============
description: Support bot regression gate

prompts:
  - file://prompt.txt

providers:
  - openai:gpt-5-mini-0613
  - anthropic:claude-haiku-4-5

defaultTest:
  vars:
    locale: en-GB
    examples: 'Q: Can I cancel? A: Yes, from Settings then Billing.'
  assert:
    - type: javascript
      value: file://../../assertions/no-placeholder.js:noPlaceholderText
    - type: latency
      threshold: 4000
    - type: llm-rubric
      value: is grounded in the supplied help-centre extract and adds no policy that is not in it
    - type: llm-rubric
      value: reads as a calm support reply, no exclamation marks, no blame

tests:
  - description: cancel_subscription
    vars:
      question: How do I cancel?
      context: A subscription can be cancelled at any time from Settings then Billing.
    assert:
      - type: icontains
        value: Settings

  - description: plan_change
    vars:
      question: I want to move from Team to Business mid-month, what happens?
      context: Plan changes take effect immediately and are prorated to the day.
      examples:
        - 'Q: Can I upgrade today? A: Yes, and we prorate it to the day.'
        - 'Q: Will I be charged twice? A: No, the change is prorated.'
        - 'Q: When does it take effect? A: Immediately.'
        - 'Q: Do I lose my settings? A: No, everything carries over.'
        - 'Q: Can I move back down? A: Yes, at the end of the period.'
        - 'Q: Is there a fee? A: No.'
    assert:
      - type: icontains
        value: prorat

  - description: shipping_refund
    vars:
      question: Do I get the postage back as well?
      context: Refunds cover the item price. Shipping charges are not refunded.
    assert:
      - type: llm-rubric
        value: states clearly that shipping is not refunded

  - description: card_declined
    vars:
      question: My card was declined, am I cut off?
      context: A declined payment retries for seven days before the account is suspended.
    assert:
      - type: icontains
        value: seven days

  - description: refund_window
    vars:
      question: How long do I have to send it back?
      context: Customers may request a full refund within 30 days of purchase.
      locale:
        - en-GB
        - en-US
        - de-DE
      examples:
        - 'Q: How long for a refund? A: 30 days from purchase.'
        - 'Q: Is it 30 days or a month? A: 30 days.'
        - 'Q: From when? A: From the purchase date.'
        - 'Q: Bank holidays? A: Calendar days.'
        - 'Q: Can it be extended? A: No.'
        - 'Q: Where do I start one? A: Settings then Orders.'
    assert:
      - type: icontains
        value: '30'

  - description: invoice_copy
    vars:
      question: Can you send me last month's invoice again?
      context: Invoices are downloadable from Settings then Billing then History.
    assert:
      - type: icontains
        value: History

  - description: seat_removal
    vars:
      question: How do I take a seat off our plan?
      context: An account owner can remove a seat from Settings then Members.
      examples:
        - 'Q: Who can remove a seat? A: The account owner.'
        - 'Q: Where? A: Settings then Members.'
        - 'Q: Does it refund? A: Billing adjusts next period.'
        - 'Q: Immediately? A: The licence frees immediately.'
        - 'Q: Can a member do it? A: No, only the owner.'
        - 'Q: Is it reversible? A: Yes, add the seat back.'
    assert:
      - type: icontains
        value: Members

  - description: tax_receipt
    vars:
      question: I need a VAT receipt for accounting.
      context: VAT receipts are attached to every invoice in Settings then Billing.
    assert:
      - type: icontains
        value: VAT

  - description: billing_contact
    vars:
      question: Can the invoices go to our finance inbox instead?
      context: The billing contact is changed under Settings then Billing then Contact.
      examples:
        - 'Q: Can I change the billing email? A: Yes, under Billing then Contact.'
        - 'Q: Does it change the login? A: No.'
        - 'Q: Can it be a shared inbox? A: Yes.'
        - 'Q: Who can change it? A: The account owner.'
        - 'Q: Will past invoices resend? A: No.'
        - 'Q: Is there a limit? A: One billing contact.'
    assert:
      - type: icontains
        value: Contact

=============== FILE: .github/workflows/eval.yml ===============
name: eval

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'evals/**'

jobs:
  gate:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Unit tests for assertion helpers
        run: node --test
      - name: Eval gate
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npx promptfoo eval -c evals/support-bot/promptfooconfig.yaml

=============== FILE: reports/pr-812-run-summary.md ===============
# PR #812, push 9 of 9, 2026-09-04T16:41Z

```
Evaluating 82 rows across 2 providers
...
Duration: 27m 11s
Successes: 74   Failures: 8
Token usage: 1,981,402 prompt / 214,880 completion
Grading calls: 164
Estimated cost this run: $45.78
```

Spend on this pull request: 9 pushes, $412.02 total. No run reused a response
from any earlier run on the branch.

Latency assertion results this run: 82 of 82 passed, recorded latencies between
612 ms and 3,940 ms.

=============== FILE: reports/pr-798-run-summary.md ===============
# PR #798, push 11 of 11, 2026-07-22T09:12Z

```
Evaluating 18 rows across 2 providers
...
Duration: 4m 02s
Successes: 18   Failures: 0
Token usage: 96,540 prompt / 21,004 completion
Grading calls: 2
Estimated cost this run: $0.85
```

Spend on this pull request: 11 pushes, $9.34 total.

=============== FILE: assertions/no-placeholder.js ===============
const PLACEHOLDERS = ['[NAME]', '[ORDER_ID]', 'TODO', 'lorem ipsum', '{{'];

export function noPlaceholderText(output) {
  const text = String(output).toLowerCase();
  return !PLACEHOLDERS.some((p) => text.includes(p.toLowerCase()));
}

=============== FILE: assertions/no-placeholder.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { noPlaceholderText } from './no-placeholder.js';

test('accepts a normal reply', () => {
  assert.equal(noPlaceholderText('You can cancel from Settings then Billing.'), true);
});

test('catches an unfilled name slot', () => {
  assert.equal(noPlaceholderText('Hi [NAME], your refund is on the way.'), false);
});

test('catches an unrendered template expression', () => {
  assert.equal(noPlaceholderText('Your order {{order_id}} was refunded.'), false);
});

test('catches leftover TODO text', () => {
  assert.equal(noPlaceholderText('TODO: explain the refund window'), false);
});
