import json
import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

from app.bot import answer

GOLDEN = json.load(open("tests/golden.json"))


@pytest.mark.parametrize("case", GOLDEN, ids=lambda c: c["question"][:30])
def test_bot(case):
    text, chunks = answer(case["question"])
    tc = LLMTestCase(
        input=case["question"],
        actual_output=text,
        expected_output=case["expected"],
        context=chunks,
    )
    assert_test(tc, [AnswerRelevancyMetric(threshold=0.5), FaithfulnessMetric(threshold=0.5)])
