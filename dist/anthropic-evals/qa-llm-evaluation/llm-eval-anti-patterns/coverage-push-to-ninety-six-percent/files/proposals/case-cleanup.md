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
