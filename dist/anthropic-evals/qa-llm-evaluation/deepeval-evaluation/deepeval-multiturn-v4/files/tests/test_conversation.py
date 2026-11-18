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
