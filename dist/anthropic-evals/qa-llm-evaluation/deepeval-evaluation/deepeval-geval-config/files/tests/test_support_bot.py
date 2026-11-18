from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from app.bot import answer

correctness = GEval(
    name="Correctness",
    criteria="Check that the actual output gives the same refund window and conditions as the expected output.",
    evaluation_steps=[
        "Compare the refund window in the actual output with the expected output.",
        "Penalize any condition that is missing or added.",
    ],
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
    threshold=0.8,
    strict_mode=True,
)


def test_refund_policy():
    q = "Can I return shoes I wore once?"
    tc = LLMTestCase(
        input=q,
        actual_output=answer(q),
        expected_output="Yes, within 30 days if they were not worn outdoors; worn items get store credit only.",
        context=["Returns are accepted within 30 days. Items worn outdoors are refunded as store credit."],
    )
    assert_test(tc, [correctness])
