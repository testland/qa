# Our G-Eval correctness score behaves strangely

## Problem Description

Our G-Eval correctness test (`tests/test_support_bot.py`) behaves strangely (`notes.md`). Find out why and fix the metric and the test.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: tests/test_support_bot.py ===============
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

=============== FILE: notes.md ===============
- The same bot answer passes on one run and fails on the next.
- Answers that drop the "store credit only" condition sometimes pass.
- We set threshold=0.8 so that mostly-right answers pass, but now even good answers fail.
