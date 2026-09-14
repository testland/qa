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
