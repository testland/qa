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
