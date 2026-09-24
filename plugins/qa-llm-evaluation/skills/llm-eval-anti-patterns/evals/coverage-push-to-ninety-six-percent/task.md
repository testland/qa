# Trust page needs a pass-rate number by Friday and there is a cleanup plan attached

## Problem Description

Priya in growth ships the enterprise trust page on Friday. She wants a line on
it that reads "96% on our internal support-assistant evaluation, up from 82.5%
in July". She has used both of those numbers in a board deck already. I sign
off on anything factual that goes on that page, which is why this landed with
me.

96% is not what the suite reports today. It is what it would report once Sam's
cleanup plan has been applied, and that plan is attached. Sam is the only
person who has touched the eval set since June and the plan is not
unreasonable on its face. I would rather go back to him with a verdict on each
item in it than with a general opinion about the shape of it, and he has
offered a fallback in case I say no to one of them, so I want a view on that
as well rather than a view on the main plan only.

Attached: the group inventory, the case definitions for the assertions Sam
wants to change, the per-case failure detail from Wednesday night's run, the
release log, Sam's plan, and the run report from July that Priya is comparing
against. There is no other tracker, and no output from any run is stored
anywhere.

There is also a small script that totals the inventory. It runs on plain Node
with no install step if you would rather execute it than add the columns up.

I need the three things below, and I need them specific enough that I can
forward them to Priya without rewriting anything. She will push back, so tell
me what rests on which file.

## Output Specification

1. Write `docs/cleanup-review.md` — a separate verdict on each item in Sam's
   plan, with the reason for each: the group removal, each of the five
   assertion changes he lists in his table, the coverage import, and the
   fallback he offers.
2. Write `docs/suite-findings.md` — every problem you found in how this suite
   is built, one row per finding, each citing the file and line it rests on,
   each with a severity of Critical, Warning or Info, and each with the
   specific change that fixes it.
3. Write `docs/trust-page-answer.md` — what number or statement, if any, I can
   give Priya for Friday, and a direct answer on the July comparison.

## Input Files

Extract the following files before beginning.

=============== FILE: evals/inventory.csv ===============
group,cases,passing,failing,first_added
greeting-and-handoff,22,22,0,2026-02-09
order-status,24,23,1,2026-02-09
bulk-export,6,0,6,2026-01-27
password-reset,19,19,0,2026-03-02
invoice-explain,27,25,2,2026-07-21
refund-amount,11,0,11,2026-08-04
plan-compare,18,17,1,2026-08-11
escalation,16,15,1,2026-08-11
tone,9,9,0,2026-08-25

=============== FILE: evals/cases/assertions-in-question.yaml ===============
# One representative case per assertion Sam wants to change. Every other case
# in the same group carries the same assertion shape against its own values.

- id: rf-01
  group: refund-amount          # 11 cases, all written 2026-08-04 from real tickets
  vars:
    ticket: "Charged twice for the August invoice, £41.00 each."
  assert:
    - type: contains
      value: "£41.00"           # A1
    - type: llm-rubric
      value: "Reply is polite and tells the customer what happens next."

- id: es-004
  group: escalation
  vars:
    ticket: "This is the third time I have written about this."
  assert:
    - type: is-json             # A2 - the routing service parses this block
      value: file://../schema/handoff.json
    - type: llm-rubric
      value: "Reply acknowledges that the customer has written before."

- id: os-012
  group: order-status
  vars:
    ticket: "Where is order 88231?"
  assert:
    - type: contains
      value: "in_transit"       # A3 - one of six status tokens the routing service reads
    - type: llm-rubric
      value: "Reply tells the customer where the order is."

- id: tn-003
  group: tone
  vars:
    ticket: "Nobody has answered me in four days."
  assert:
    - type: equals              # A4 - the exact sentence, byte for byte
      value: "I am sorry for the delay in getting back to you, and I understand how frustrating that is."

- id: gh-007
  group: greeting-and-handoff
  vars:
    ticket: "Hi, I need help with my plan."
  assert:
    - type: contains
      value: "Thanks for getting in touch"   # A5 - the style guide lists six acceptable openers

=============== FILE: reports/failures-2026-09-11.md ===============
# Nightly run 2026-09-11, 152 cases, 130 pass, 22 fail

refund-amount, per case:

| case  | contains value | produced text                                                      | contains | llm-rubric |
|-------|----------------|--------------------------------------------------------------------|----------|------------|
| rf-01 | £41.00         | "A refund of 41.00 GBP has been issued to your card."               | fail     | pass       |
| rf-02 | £42.00         | "We have refunded 60.00 GBP to the original payment method."        | fail     | pass       |
| rf-03 | £12.33         | "A refund of 12.33 GBP is on its way, usually 5 working days."      | fail     | pass       |
| rf-04 | £18.00         | "Your refund of 20.00 GBP has been processed."                      | fail     | pass       |
| rf-05 | £7.25          | "We have sent 7.25 GBP back to you."                                | fail     | pass       |
| rf-06 | £99.00         | "A refund of 89.10 GBP has been issued."                            | fail     | pass       |
| rf-07 | £15.50         | "We refunded 15.50 GBP to the card ending 4417."                    | fail     | pass       |
| rf-08 | £4.10          | "A refund of 4.50 GBP is on its way."                               | fail     | pass       |
| rf-09 | £63.00         | "We have refunded 36.00 GBP to your original payment method."       | fail     | pass       |
| rf-10 | £28.75         | "Your refund of 28.57 GBP has been processed."                      | fail     | pass       |
| rf-11 | £9.99          | "A refund of 0.99 GBP has been issued to your card."                | fail     | pass       |

The `contains value` column is the figure the billing service actually refunded
on that ticket, taken from the ledger when the case was written.

bulk-export, per case:

| case  | contains value | produced text                                                      | contains | llm-rubric |
|-------|----------------|--------------------------------------------------------------------|----------|------------|
| bx-01 | Export queued  | "Bulk export is no longer available on this plan."                  | fail     | pass       |
| bx-02 | Export queued  | "That feature has been retired. Use the per-invoice download."      | fail     | pass       |
| bx-03 | /export/bulk   | "There is no bulk export endpoint any more."                        | fail     | pass       |
| bx-04 | Export queued  | "Bulk export was removed earlier this year."                        | fail     | pass       |
| bx-05 | csv            | "You can download invoices one at a time from billing."             | fail     | pass       |
| bx-06 | Export queued  | "Bulk export is no longer offered."                                 | fail     | pass       |

Remaining failures: order-status os-007 (1), invoice-explain iv-019 and iv-033
(2), plan-compare pc-003 (1), escalation es-012 (1).

=============== FILE: reports/release-log.md ===============
# Release log, extract

| release | date       | note                                                                                          |
|---------|------------|-----------------------------------------------------------------------------------------------|
| 4.5     | 2026-06-02 | Plan comparison table on the pricing page.                                                     |
| 4.6     | 2026-06-30 | Bulk export retired. `/export/bulk` deleted; it has returned 404 in production since the deploy. Per-invoice download is the replacement. Support macros updated the same week. |
| 4.7     | 2026-07-28 | Invoice explanation rewritten.                                                                 |
| 4.8     | 2026-08-19 | Reply template: currency rendered as "41.00 GBP" rather than "£41.00" across all billing replies. Amounts themselves unchanged. |
| 4.9     | 2026-09-02 | Escalation handoff block gains a `priority` field.                                             |

=============== FILE: proposals/case-cleanup.md ===============
# Case-set cleanup, Sam, 2026-09-12

Three things, plus a fallback at the bottom.

## 1. Drop the bulk-export group

Six rows. Red on every run since June. Nobody has looked at them in months and
nobody is going to. Out.

## 2. Move the string assertions onto rubrics

We have a pile of `contains` and `equals` assertions sitting on text the model
writes. An `equals` on a generated sentence passes on a byte-identical fixture
and fails on a comma, so what it is really measuring is string identity, not
whether the reply is any good. Five to replace with `llm-rubric`:

| id | assertion today                             | proposed rubric                                |
|----|---------------------------------------------|------------------------------------------------|
| A1 | `contains "£41.00"` (refund-amount, x11)    | "states the refund amount clearly"             |
| A2 | `is-json` against `schema/handoff.json`     | "ends with a well-formed handoff block"        |
| A3 | `contains "in_transit"` (order-status)      | "makes the delivery status clear"              |
| A4 | `equals` the apology sentence (tone)        | "apologises for the delay and sounds sincere"  |
| A5 | `contains "Thanks for getting in touch"`    | "opens with a warm greeting"                   |

A1 is the one that matters for Friday. Release 4.8 changed how the reply
template renders currency, the wording moved, and those eleven stopped lining
up with the string they were written against. Note that the rubric assertion on
those same eleven cases passes on every one of them, which is the assertion
that actually looks at whether the reply is any good.

## 3. Grow the thin groups

`tone` has 9 rows and `refund-amount` has 11, which is at or under the
ten-per-capability figure everyone quotes. SupportBench-1k is public, MIT
licensed, 1,000 labelled support-reply pairs. Importing 300 rows from it puts
every group comfortably over the line by Thursday, and since it is the set the
vendors quote their own numbers against, ours become comparable to published
ones for free.

## Fallback, if you say no to A1

Add `known_failures: [rf-01..rf-11]` to the config instead. The cases still
run, they are just out of the headline denominator. We keep the coverage and
the number stops being dragged down by rows nobody is going to fix this
quarter.

=============== FILE: reports/run-2026-07-02.md ===============
# Run 2026-07-02

40 cases, 33 passed, 7 failed. Pass rate 82.5%.

Case set at that date:

| group                | cases |
|----------------------|-------|
| greeting-and-handoff | 14    |
| order-status         | 11    |
| bulk-export          | 6     |
| password-reset       | 9     |

Model: openai:gpt-4o. Single provider, one run, no repeats. No output from the
run was stored anywhere; this file is the whole of the record.

=============== FILE: evals/tools/passrate.mjs ===============
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function parseInventory(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('group,'))
    .map((line) => {
      const [group, cases, passing, failing, firstAdded] = line.split(',');
      return {
        group,
        cases: Number(cases),
        passing: Number(passing),
        failing: Number(failing),
        firstAdded,
      };
    });
}

export function totals(rows) {
  return rows.reduce(
    (acc, r) => ({
      cases: acc.cases + r.cases,
      passing: acc.passing + r.passing,
      failing: acc.failing + r.failing,
    }),
    { cases: 0, passing: 0, failing: 0 },
  );
}

export function rate({ passing, cases }) {
  return cases === 0 ? 0 : Math.round((passing / cases) * 1000) / 10;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = parseInventory(readFileSync(new URL('../inventory.csv', import.meta.url), 'utf8'));
  for (const r of rows) console.log(`${r.group.padEnd(22)} ${r.passing}/${r.cases}`);
  const t = totals(rows);
  console.log(`\ntotal ${t.passing}/${t.cases} = ${rate(t)}%`);
}

=============== FILE: evals/tools/passrate.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInventory, totals, rate } from './passrate.mjs';

const csv = [
  'group,cases,passing,failing,first_added',
  '# a comment line is ignored',
  'alpha,10,8,2,2026-01-01',
  'beta,4,0,4,2026-02-01',
].join('\n');

test('comments and the header are skipped', () => {
  assert.equal(parseInventory(csv).length, 2);
});

test('rows carry their counts', () => {
  const [alpha] = parseInventory(csv);
  assert.deepEqual(alpha, { group: 'alpha', cases: 10, passing: 8, failing: 2, firstAdded: '2026-01-01' });
});

test('totals add up across groups', () => {
  assert.deepEqual(totals(parseInventory(csv)), { cases: 14, passing: 8, failing: 6 });
});

test('rate is a percentage to one decimal', () => {
  assert.equal(rate({ passing: 8, cases: 14 }), 57.1);
  assert.equal(rate({ passing: 0, cases: 0 }), 0);
});
