import json
import pathlib

import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

ROOT = pathlib.Path(__file__).resolve().parents[2]
GOLDENS = [
    json.loads(line)
    for line in (ROOT / "data" / "goldens.jsonl").read_text(encoding="utf-8").splitlines()
    if line.strip()
]
IDS = [g["id"] for g in GOLDENS]


def build(g):
    return LLMTestCase(
        input=g["question"],
        actual_output=g["answer"],
        retrieval_context=g["chunks"],
    )


@pytest.mark.parametrize("g", GOLDENS, ids=IDS)
def test_answer_is_grounded(g):
    assert_test(build(g), [FaithfulnessMetric(threshold=0.7)])


@pytest.mark.parametrize("g", GOLDENS, ids=IDS)
def test_answer_addresses_the_question(g):
    assert_test(build(g), [AnswerRelevancyMetric(threshold=0.7)])
