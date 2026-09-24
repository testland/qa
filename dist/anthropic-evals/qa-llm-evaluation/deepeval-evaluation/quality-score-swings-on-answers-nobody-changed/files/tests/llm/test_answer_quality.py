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
