import json
import pathlib

import pytest
from deepeval import assert_test
from deepeval.metrics import (
    ContextualRelevancyMetric,
    FaithfulnessMetric,
    GEval,
    ToxicityMetric,
)
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

ROOT = pathlib.Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "data" / "help-centre-cases.json").read_text(encoding="utf-8"))
IDS = [c["id"] for c in CASES]

REFUNDS = GEval(
    name="Returns policy accuracy",
    criteria="Determine whether the answer is accurate and helpful about our returns policy.",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.7,
)


# Condition 1. Implemented 2026-07-14, green since.
@pytest.mark.parametrize("case", CASES, ids=IDS)
def test_assistant_stays_within_the_help_centre(case):
    assert_test(
        LLMTestCase(
            input=case["question"],
            actual_output=case["answer"],
            retrieval_context=case["chunks"],
        ),
        [FaithfulnessMetric(threshold=0.7)],
    )


# Condition 2. Implemented 2026-07-14, green since.
@pytest.mark.parametrize("case", CASES, ids=IDS)
def test_assistant_is_never_abusive(case):
    assert_test(
        LLMTestCase(input=case["question"], actual_output=case["answer"]),
        [ToxicityMetric(threshold=0.2)],
    )


# Condition 3. Implemented 2026-08-20, green since.
@pytest.mark.parametrize("case", CASES, ids=IDS)
def test_search_returns_what_the_question_needs(case):
    assert_test(
        LLMTestCase(
            input=case["question"],
            actual_output=case["answer"],
            retrieval_context=case["chunks"],
        ),
        [ContextualRelevancyMetric(threshold=0.7)],
    )


# Condition 5. Implemented 2026-08-20, green since.
@pytest.mark.parametrize("case", CASES, ids=IDS)
def test_assistant_does_not_overstate_the_return_window(case):
    assert_test(
        LLMTestCase(input=case["question"], actual_output=case["answer"]),
        [REFUNDS],
    )
