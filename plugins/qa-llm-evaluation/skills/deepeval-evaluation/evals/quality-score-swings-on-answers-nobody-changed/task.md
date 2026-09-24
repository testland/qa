# The Quality gate gives a different verdict every run on inputs that never change

## Problem Description

Background, because the history matters here.

We have a gate on the support assistant called Quality. Nothing it evaluates
moves between runs: the twelve cases are a checked-in file of fixed questions
and fixed answers, no model is called to produce them, they are literal strings
in `data/quality-cases.json`. Despite that, the gate goes red and green
seemingly at random. We re-ran the identical suite five times back to back last
Tuesday to see how bad it is, and the per-run scores are attached.

What brought this to a head: a week ago someone merged a branch where two of the
answers in the cases file had been left as the placeholder string `TODO`. It
went unnoticed for four days and the gate was green on every one of them,
including the run right after the merge. Those two placeholder answers are still
in the file exactly as merged, because I asked for them to be left alone until
somebody looked at this properly.

Two proposals are on the table and I want your answer on each of them.

- Drop the passing bar from 0.6 to 0.35. The low end of the observed range is
  around 0.4, so a bar under the range would stop the flapping.
- Pin the judge model version and run each case three times, taking the mean.

The rubric text itself was tightened in March and nobody has touched it since.
There is a second metric in the same file, `Refund window accuracy`, written by
someone who has since left; it runs over the three refund cases and its scores
in the attached report barely move.

## Output Specification

1. Edit `tests/llm/test_answer_quality.py`. Fix the Quality gate so that
   repeated runs over the same fixed inputs agree with each other, and so that
   the two placeholder answers cannot pass it.
2. Do not change `data/quality-cases.json`. I want to be able to re-run your
   version against the file as it stands, placeholders included, and watch it go
   red.
3. Write `docs/quality-gate-diagnosis.md` stating what the gate has actually
   been measuring, the specific rows in the attached report that establish it,
   and your answer on each of the two proposals above.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/llm/test_answer_quality.py ===============
import json
import pathlib

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

ROOT = pathlib.Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "data" / "quality-cases.json").read_text(encoding="utf-8"))
IDS = [c["id"] for c in CASES]

# Rubric tightened 2026-03-09. Unchanged since.
quality = GEval(
    name="Quality",
    criteria=(
        "Judge ACTUAL OUTPUT as a reply to the question in INPUT, against EXPECTED OUTPUT. "
        "Award 1.0 when ACTUAL OUTPUT answers the question that was asked, states no fact "
        "that is absent from EXPECTED OUTPUT, and names where in the product to act when an "
        "action is involved. Award 0.0 when ACTUAL OUTPUT is empty, is a placeholder such as "
        "TODO or TBD, refuses to help, or redirects the customer to another channel instead "
        "of answering. Ignore tone, warmth, politeness and length; none of them are gated."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.6,
)

# Written 2026-01. Scores move by at most 0.04 between runs.
refund_window_accuracy = GEval(
    name="Refund window accuracy",
    criteria=(
        "Decide whether ACTUAL OUTPUT states the same refund window as EXPECTED OUTPUT. "
        "Award 1.0 only when both state 30 days. Award 0.0 when ACTUAL OUTPUT states any "
        "other number of days, omits the window, or redirects the customer to support "
        "instead of stating the window. Ignore differences in wording, politeness and "
        "length; only the stated window counts."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
    threshold=0.9,
)


@pytest.mark.parametrize("case", CASES, ids=IDS)
def test_answer_quality(case):
    assert_test(
        LLMTestCase(
            input=case["question"],
            actual_output=case["answer"],
            expected_output=case["expected"],
        ),
        [quality],
    )


@pytest.mark.parametrize("case", [c for c in CASES if c["topic"] == "refunds"], ids=lambda c: c["id"])
def test_refund_window_accuracy(case):
    assert_test(
        LLMTestCase(
            input=case["question"],
            actual_output=case["answer"],
            expected_output=case["expected"],
        ),
        [refund_window_accuracy],
    )

=============== FILE: data/quality-cases.json ===============
[
  {"id": "q-01", "topic": "refunds", "question": "How long do I have to return this?", "answer": "You can request a full refund within 30 days of purchase.", "expected": "You can request a full refund within 30 days of purchase."},
  {"id": "q-02", "topic": "refunds", "question": "Is there a deadline on refunds?", "answer": "Refund requests are accepted for 30 days after purchase.", "expected": "Refund requests are accepted for 30 days after purchase."},
  {"id": "q-03", "topic": "refunds", "question": "What if I miss the refund window?", "answer": "After 30 days it is handled as goodwill at the support lead's discretion.", "expected": "After 30 days refunds are goodwill only, at the support lead's discretion."},
  {"id": "q-04", "topic": "billing", "question": "When am I charged?", "answer": "On the same day each month, starting from your signup date.", "expected": "Billing runs monthly on your signup anniversary."},
  {"id": "q-05", "topic": "billing", "question": "Can I get an invoice?", "answer": "TODO", "expected": "Invoices are available under Settings > Billing > Invoices."},
  {"id": "q-06", "topic": "billing", "question": "Do you take purchase orders?", "answer": "TODO", "expected": "Purchase orders are supported on annual plans; contact sales."},
  {"id": "q-07", "topic": "seats", "question": "How do I add a teammate?", "answer": "An account owner adds them from Settings > Members; the seat is prorated on your next invoice.", "expected": "An account owner adds members from Settings > Members; new seats are prorated on the next invoice."},
  {"id": "q-08", "topic": "seats", "question": "How do I add a teammate?", "answer": "I am not able to help with that. Please contact support.", "expected": "An account owner adds members from Settings > Members; new seats are prorated on the next invoice."},
  {"id": "q-09", "topic": "seats", "question": "Can a member invite others?", "answer": "No, only account owners can invite.", "expected": "Only account owners can invite members."},
  {"id": "q-10", "topic": "security", "question": "Do you support SSO?", "answer": "SAML SSO is available on the Scale tier, configured from Settings > Security.", "expected": "SAML SSO is available on the Scale tier, configured from Settings > Security."},
  {"id": "q-11", "topic": "security", "question": "Where is our data held?", "answer": "In the region you picked at signup: EU, US or AP.", "expected": "Account data is held in the region selected at signup: EU, US or AP."},
  {"id": "q-12", "topic": "security", "question": "Is data encrypted at rest?", "answer": "Yes, at rest and in transit.", "expected": "Data is encrypted at rest and in transit."}
]

=============== FILE: reports/rubric-stability.md ===============
# Five consecutive runs of the identical suite, 2026-09-08

Same twelve cases, same checked-in strings, no application code executed between
runs. Only the judge ran. Judge model and temperature were the same on all five.

## Quality (bar 0.60)

| Case | run 1 | run 2 | run 3 | run 4 | run 5 | verdict spread  |
|------|-------|-------|-------|-------|-------|-----------------|
| q-01 | 0.74  | 0.52  | 0.88  | 0.61  | 0.43  | 3 pass / 2 fail |
| q-02 | 0.69  | 0.71  | 0.44  | 0.83  | 0.55  | 3 pass / 2 fail |
| q-03 | 0.58  | 0.90  | 0.47  | 0.66  | 0.79  | 3 pass / 2 fail |
| q-04 | 0.81  | 0.46  | 0.72  | 0.51  | 0.68  | 3 pass / 2 fail |
| q-05 | 0.72  | 0.64  | 0.85  | 0.59  | 0.77  | 4 pass / 1 fail |
| q-06 | 0.81  | 0.70  | 0.63  | 0.88  | 0.74  | 5 pass / 0 fail |
| q-07 | 0.66  | 0.79  | 0.52  | 0.71  | 0.60  | 4 pass / 1 fail |
| q-08 | 0.66  | 0.79  | 0.52  | 0.71  | 0.60  | 4 pass / 1 fail |
| q-09 | 0.57  | 0.83  | 0.69  | 0.48  | 0.75  | 3 pass / 2 fail |
| q-10 | 0.88  | 0.61  | 0.53  | 0.79  | 0.67  | 4 pass / 1 fail |
| q-11 | 0.73  | 0.49  | 0.81  | 0.64  | 0.58  | 3 pass / 2 fail |
| q-12 | 0.62  | 0.86  | 0.51  | 0.70  | 0.77  | 4 pass / 1 fail |

Observed range across every case and run: 0.43 to 0.90. Gate outcome: red on
runs 1, 2, 3, 4 and 5 — a different set of cases each time.

## Refund window accuracy (bar 0.90)

| Case | run 1 | run 2 | run 3 | run 4 | run 5 |
|------|-------|-------|-------|-------|-------|
| q-01 | 1.00  | 1.00  | 1.00  | 1.00  | 1.00  |
| q-02 | 1.00  | 1.00  | 0.98  | 1.00  | 1.00  |
| q-03 | 0.96  | 1.00  | 0.97  | 0.99  | 0.98  |

=============== FILE: requirements.txt ===============
deepeval==3.2.6
pytest==8.3.3
