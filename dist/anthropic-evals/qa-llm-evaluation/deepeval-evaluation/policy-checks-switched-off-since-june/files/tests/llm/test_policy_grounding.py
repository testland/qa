import json
import pathlib

import pytest
from deepeval import assert_test
from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualRecallMetric,
    FaithfulnessMetric,
    HallucinationMetric,
)
from deepeval.test_case import LLMTestCase

ROOT = pathlib.Path(__file__).resolve().parents[2]
GOLDENS = json.loads((ROOT / "data" / "policy-goldens.json").read_text(encoding="utf-8"))
CASE_IDS = [g["id"] for g in GOLDENS]


def golden(case_id):
    return next(g for g in GOLDENS if g["id"] == case_id)


# Green since 2026-02-03. Never errored.
@pytest.mark.parametrize("case_id", CASE_IDS)
def test_answer_is_supported_by_retrieved_chunks(case_id):
    g = golden(case_id)
    assert_test(
        LLMTestCase(
            input=g["question"],
            actual_output=g["answer"],
            retrieval_context=g["retrieved"],
        ),
        [FaithfulnessMetric(threshold=0.7)],
    )


# Errored 2026-06-19 (#812). Re-enabled by the contractor 2026-07-02. Green since.
@pytest.mark.parametrize("case_id", CASE_IDS)
def test_answer_does_not_contradict_written_policy(case_id):
    g = golden(case_id)
    assert_test(
        LLMTestCase(
            input=g["question"],
            actual_output=g["answer"],
            context=g["policy_text"],
        ),
        [HallucinationMetric(threshold=0.2)],
    )


# Errored 2026-06-19 (#812). Still off.
@pytest.mark.skip(reason="MissingTestCaseParamsError since 2026-06-19, see #812")
@pytest.mark.parametrize("case_id", CASE_IDS)
def test_retrieval_covers_the_answer_we_expect(case_id):
    g = golden(case_id)
    assert_test(
        LLMTestCase(
            input=g["question"],
            actual_output=g["answer"],
            retrieval_context=g["retrieved"],
        ),
        [ContextualRecallMetric(threshold=0.7)],
    )


# Green since 2026-02-03. Never errored.
def test_answer_addresses_the_question():
    g = golden("seat-removal")
    assert_test(
        LLMTestCase(input=g["question"], actual_output=g["answer"]),
        [AnswerRelevancyMetric(threshold=0.7)],
    )
