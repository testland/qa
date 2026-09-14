# The nightly was green all six nights the assistant was telling people 60 days

## Problem Description

INC-4471. Between 2026-09-02 and 2026-09-08 the help-desk assistant told roughly
340 customers they had 60 days to return an order. The written policy is 30 days
and has been for four years. Support has been issuing goodwill refunds all week.

The nightly quality job ran on every one of those six nights and reported green
every time. I have attached the suite, the workflow that runs it, and the full
log from the 2026-09-04 run, which is the middle of the incident window and the
run the CX director has asked me about by name.

Two bits of history you should have. Mara went through this file on 2026-08-28
and put assertions on three of the six checks — that is PR #219, and the comment
is still on them — so I am told half the suite is gating properly already. I
have no way to tell whether that is true. Separately, the on-call write-up from
the 8th says the suite "just needs more cases covering refund phrasing".

What I have been asked to put in writing, and cannot answer today, is this: if
the assistant had been answering "60 days" on the night of the 4th, what would
this job have done? Give me that answer with the log in front of you rather than
a general opinion about evals.

Constraints. Do not remove coverage — those six cases are the only automated
check anyone has written for this assistant, and `test_refund_question_is_answered`
was set up carefully in April and has been left alone since. Budget is not a
constraint; if a run costs more because it now decides something, that is fine.

## Output Specification

1. Edit `tests/llm/test_help_answers.py` so that a case scoring below its bar
   makes the job fail. Leave anything already doing that alone.
2. Edit `.github/workflows/llm-eval.yml` if the way the suite is invoked needs
   to change.
3. Add at least one case reproducing INC-4471 — the assistant answering "60
   days" against the 30-day help-centre text — so a repeat goes red.
4. Write `docs/inc-4471-eval-postmortem.md`. It must explain, citing specific
   lines from the attached log, why the run on 2026-09-04 exited zero, and say
   what would have had to be true for it to exit non-zero.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/llm/test_help_answers.py ===============
from deepeval import assert_test, evaluate
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

HELP_CENTRE = {
    "refunds": [
        "Customers may request a full refund within 30 days of purchase.",
        "Refunds are issued to the original payment method within 5 business days.",
    ],
    "cancellation": [
        "A subscription can be cancelled at any time from Settings > Billing.",
        "Cancelling takes effect at the end of the current billing period.",
    ],
    "seats": [
        "An account owner can remove a seat from Settings > Members.",
        "Removing a seat frees the licence immediately; billing adjusts next period.",
    ],
}


def case(question, answer, chunks):
    return LLMTestCase(input=question, actual_output=answer, retrieval_context=chunks)


# Added 2026-04-11 with the first version of the assistant. Do not touch.
def test_refund_question_is_answered():
    assert_test(
        case(
            "How long do I have to send something back?",
            "You can request a full refund within 30 days of purchase.",
            HELP_CENTRE["refunds"],
        ),
        [AnswerRelevancyMetric(threshold=0.7)],
    )


# PR #219, 2026-08-28 — hardened: assert on the result of the batch run.
def test_refund_answer_is_grounded():
    assert evaluate(
        test_cases=[
            case(
                "How long do I have to send something back?",
                "You can request a full refund within 30 days of purchase.",
                HELP_CENTRE["refunds"],
            )
        ],
        metrics=[FaithfulnessMetric(threshold=0.7)],
    )


# PR #219, 2026-08-28 — hardened: assert on the result of the batch run.
def test_refund_timing_answer_is_grounded():
    assert evaluate(
        test_cases=[
            case(
                "When does the money actually land back on my card?",
                "Refunds reach the original payment method within 5 business days.",
                HELP_CENTRE["refunds"],
            )
        ],
        metrics=[FaithfulnessMetric(threshold=0.7)],
    )


# PR #219, 2026-08-28 — hardened: assert on the result of the batch run.
def test_cancellation_answer_is_grounded():
    assert evaluate(
        test_cases=[
            case(
                "Can I cancel halfway through the month?",
                "Yes. Cancel from Settings > Billing and it applies at the end of the period.",
                HELP_CENTRE["cancellation"],
            )
        ],
        metrics=[FaithfulnessMetric(threshold=0.7)],
    )


def test_seat_removal_answer_is_relevant():
    evaluate(
        test_cases=[
            case(
                "How do I take a seat off our plan?",
                "Seat changes are handled by our billing team, please open a ticket.",
                HELP_CENTRE["seats"],
            )
        ],
        metrics=[AnswerRelevancyMetric(threshold=0.7)],
    )


def test_seat_removal_answer_is_grounded():
    evaluate(
        test_cases=[
            case(
                "How do I take a seat off our plan?",
                "Seat changes are handled by our billing team, please open a ticket.",
                HELP_CENTRE["seats"],
            )
        ],
        metrics=[FaithfulnessMetric(threshold=0.0)],
    )

=============== FILE: reports/nightly-2026-09-04.md ===============
# Nightly quality job — run 2026-09-04T02:14Z — workflow run 118447

Runner: ubuntu-latest. Command: `pytest tests/llm -q`

```
tests/llm/test_help_answers.py::test_refund_question_is_answered
  AnswerRelevancy   score 0.94   threshold 0.70

tests/llm/test_help_answers.py::test_refund_answer_is_grounded
  Faithfulness      score 0.22   threshold 0.70

tests/llm/test_help_answers.py::test_refund_timing_answer_is_grounded
  Faithfulness      score 0.31   threshold 0.70

tests/llm/test_help_answers.py::test_cancellation_answer_is_grounded
  Faithfulness      score 0.88   threshold 0.70

tests/llm/test_help_answers.py::test_seat_removal_answer_is_relevant
  AnswerRelevancy   score 0.48   threshold 0.70

tests/llm/test_help_answers.py::test_seat_removal_answer_is_grounded
  Faithfulness      score 0.19   threshold 0.00

====================== 6 passed in 214.77s ======================
```

Job conclusion: success. Exit code 0. Nightly Slack post: "LLM quality: 6/6 green."

Fourteen-night history of the same six tests: 84 test results, 84 reported
passed, 0 reported failed, every job conclusion success. That window spans
PR #219 on 2026-08-28 — 36 results before it, 48 after, all reported passed.
Recorded metric scores over those fourteen nights range from 0.17 to 0.95.

=============== FILE: .github/workflows/llm-eval.yml ===============
name: llm-eval

on:
  schedule:
    - cron: "14 2 * * *"
  workflow_dispatch:

jobs:
  nightly:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - name: Run quality suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: pytest tests/llm -q
      - name: Post to Slack
        if: always()
        run: ./scripts/post-nightly.sh

=============== FILE: requirements.txt ===============
deepeval==3.2.6
pytest==8.3.3
