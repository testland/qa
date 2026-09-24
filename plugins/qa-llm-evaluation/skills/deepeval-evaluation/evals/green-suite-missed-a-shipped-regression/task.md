# The nightly was green all six nights the assistant was telling people 60 days

## Problem Description

INC-4471. Between 2026-09-02 and 2026-09-08 the help-desk assistant told roughly
340 customers they had 60 days to return an order. The written policy is 30 days
and has been for four years. Support has been issuing goodwill refunds all week.

The nightly quality job ran on every one of those six nights and reported green
every time. The job asks the live assistant the six questions first, writes the
answers to `data/nightly-capture.json`, and then runs the suite over that file. I
have restored the capture from the 2026-09-04 run — the middle of the incident
window, and the run the CX director has asked me about by name — so you are
working against exactly what the job saw that night. The suite, the workflow and
the full log from that run are attached with it.

Two bits of history you should have. Mara went through this file on 2026-08-28
and put assertions on three of the six checks — that is PR #219, the comment is
still on them, and that half of the suite has been gating properly ever since,
which is the only good news in any of this. Separately, the on-call write-up from
the 8th concluded the suite "just needs more cases covering refund phrasing",
and that is what the team currently believes the fix is.

What I have been asked to put in writing, and cannot answer today, is this: the
assistant said 60 days on the night of the 4th and the job went green anyway.
Why. I want that answered with the attached run in front of you rather than a
general opinion about evals.

Constraints. Do not remove coverage — those six cases are the only automated
check anyone has written for this assistant, and `test_refund_question_is_answered`
was set up carefully in April and has been left alone since. Budget is not a
constraint; if a run costs more because it now decides something, that is fine.

## Output Specification

1. Edit `tests/llm/test_help_answers.py` so that the suite would have gone red on
   the night of the 4th. Leave anything already doing its job alone.
2. Edit `.github/workflows/llm-eval.yml` if the way the suite is invoked needs to
   change.
3. Add at least one case covering INC-4471 — the assistant answering "60 days"
   against the 30-day help-centre text — so a repeat goes red.
4. Write `docs/inc-4471-eval-postmortem.md`. It must explain why the run on
   2026-09-04 exited zero, and say what would have had to be true for it to exit
   non-zero.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/llm/test_help_answers.py ===============
import json
import pathlib

from deepeval import assert_test, evaluate
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

ROOT = pathlib.Path(__file__).resolve().parents[2]
CAPTURE = json.loads((ROOT / "data" / "nightly-capture.json").read_text(encoding="utf-8"))

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


def case(key, topic):
    row = CAPTURE[key]
    return LLMTestCase(
        input=row["question"],
        actual_output=row["answer"],
        retrieval_context=HELP_CENTRE[topic],
    )


# Added 2026-04-11 with the first version of the assistant. Do not touch.
def test_refund_question_is_answered():
    assert_test(case("refund-window", "refunds"), [AnswerRelevancyMetric(threshold=0.7)])


# PR #219, 2026-08-28 — hardened: assert on the result of the batch run.
def test_refund_answer_is_grounded():
    assert evaluate(
        test_cases=[case("refund-window", "refunds")],
        metrics=[FaithfulnessMetric(threshold=0.7)],
    )


# PR #219, 2026-08-28 — hardened: assert on the result of the batch run.
def test_refund_timing_answer_is_grounded():
    assert evaluate(
        test_cases=[case("refund-timing", "refunds")],
        metrics=[FaithfulnessMetric(threshold=0.7)],
    )


# PR #219, 2026-08-28 — hardened: assert on the result of the batch run.
def test_cancellation_answer_is_grounded():
    assert evaluate(
        test_cases=[case("cancellation", "cancellation")],
        metrics=[FaithfulnessMetric(threshold=0.7)],
    )


def test_seat_removal_answer_is_relevant():
    evaluate(
        test_cases=[case("seat-removal", "seats")],
        metrics=[AnswerRelevancyMetric(threshold=0.7)],
    )


def test_seat_removal_answer_is_grounded():
    evaluate(
        test_cases=[case("seat-removal", "seats")],
        metrics=[FaithfulnessMetric(threshold=0.0)],
    )

=============== FILE: data/nightly-capture.json ===============
{
  "refund-window": {
    "question": "How long do I have to send something back?",
    "answer": "You can request a full refund within 60 days of purchase."
  },
  "refund-timing": {
    "question": "When does the money actually land back on my card?",
    "answer": "Refunds reach the original payment method within 5 business days."
  },
  "cancellation": {
    "question": "Can I cancel halfway through the month?",
    "answer": "Yes. Cancel from Settings > Billing and it applies at the end of the period."
  },
  "seat-removal": {
    "question": "How do I take a seat off our plan?",
    "answer": "Seat changes are handled by our billing team, please open a ticket."
  }
}

=============== FILE: reports/nightly-2026-09-04.md ===============
# Nightly quality job — run 2026-09-04T02:14Z — workflow run 118447

Runner: ubuntu-latest.

Step `Capture assistant answers` — completed in 31s, 4 answers written to
`data/nightly-capture.json`. That file is the one restored alongside this report.

Step `Run quality suite` — `pytest tests/llm -q`

```
......
6 passed in 214.77s
```

Job conclusion: success. Exit code 0. Nightly Slack post: "LLM quality: 6/6
green."

Fourteen-night history of the same six tests: 84 test results, 84 reported
passed, 0 reported failed, every job conclusion success. That window spans PR
#219 on 2026-08-28 — 36 results before it, 48 after.

The job has never produced a per-case score anywhere anyone can read. The CX
director has asked for that too.

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
      - name: Capture assistant answers
        env:
          ASSISTANT_URL: ${{ secrets.ASSISTANT_URL }}
        run: python scripts/capture_answers.py > data/nightly-capture.json
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
