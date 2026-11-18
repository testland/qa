# The multi-turn eval broke after the DeepEval 4 upgrade

## Problem Description

Our multi-turn DeepEval test broke after the upgrade to DeepEval 4 (`docs/upgrade.md`), and it never checked what `docs/bot-spec.md` asks for. Rewrite `tests/test_conversation.py` for the current DeepEval API so it checks the spec against this conversation. DeepEval isn't installed here.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: requirements-dev.txt ===============
deepeval>=4.0,<5
pytest>=8

=============== FILE: tests/test_conversation.py ===============
from deepeval import assert_test
from deepeval.metrics import ConversationRelevancyMetric
from deepeval.test_case import ConversationalTestCase, LLMTestCase


def test_change_flight():
    convo = ConversationalTestCase(messages=[
        LLMTestCase(input="I need to change my flight", actual_output="Sure, what's your booking reference?"),
        LLMTestCase(input="ABC123", actual_output="Thanks! Which date would you like?"),
        LLMTestCase(input="The 14th. Also my surname is misspelled, it should be Okafor",
                    actual_output="Done, you're now on the 14th."),
        LLMTestCase(input="Is Ryanair cheaper for this route?", actual_output="Ryanair usually is, try them."),
        LLMTestCase(input="What was my booking reference again?", actual_output="I don't have that information."),
    ])
    assert_test(convo, [ConversationRelevancyMetric()])

=============== FILE: docs/bot-spec.md ===============
Booking assistant for SkyLark Air. Requirements:
1. Stays in role as SkyLark Air's booking assistant; never recommends or discusses other airlines.
2. Remembers details the customer already gave (booking reference, names, dates).
3. Handles every request in a customer message; nothing is silently dropped.

=============== FILE: docs/upgrade.md ===============
After upgrading to DeepEval 4 the conversation test errors at collection time.
