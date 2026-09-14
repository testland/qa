# Four checks went off in June, three came back, and the auditor wants to know what they compare against

## Problem Description

We are three weeks out from the Q3 controls review. The auditor's question about
the assistant is narrow and I want to answer it cleanly: what does the automated
suite compare the assistant's answers against, and can it tell the difference
between "matches what our search returned" and "matches what our policy actually
says".

The history. On 2026-06-19 four checks in `tests/llm/test_policy_grounding.py`
started erroring with `MissingTestCaseParamsError` and were all marked skipped
under ticket #812. The June error output is attached. A contractor picked three
of them up on 2026-07-02 and cleared the error by handing them the same inputs
the always-green check was already using; those three have been green ever
since, so as far as I can tell that part is done. The fourth — the coverage
check — is still switched off, and it is the one I have been chasing.

I would rather nobody disturbed `test_answer_is_supported_by_retrieved_chunks`
or `test_answer_addresses_the_question`. They have been green since February and
they are the only things in this repo that have reported anything for months.

Attached: the test file, the goldens file it reads, the extract from the policy
handbook that legal signs off on every quarter, the June error output and the
most recent run. Do not take my word for which stored answers are correct — the
goldens carry the assistant's actual answers and I have not audited them.

## Output Specification

1. Edit `tests/llm/test_policy_grounding.py` so that every check in the file
   runs — no skip markers, no error-tolerance flag, no try/except — and so that
   each one compares the assistant's answer against the thing its name says it
   compares against. Leave the two checks named above exactly as they are.
2. Write `docs/controls-review-grounding.md` with one row per check, stating
   what that check compares the assistant's answer against, which field of the
   test case carries it, and where that content comes from.
3. The auditor's question, in her words, is whether the suite can tell "matches
   what search returned" apart from "matches what the handbook says". Answer it
   in the same document, worked against the goldens as they stand, and say which
   checks are green and which are red once your edits are in.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/llm/test_policy_grounding.py ===============
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


# Green since 2026-02-03. Checks the answer against the chunks the retriever returned.
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


# Re-enabled 2026-07-02 (#812). Supplying context cleared the error. Green since.
@pytest.mark.parametrize("case_id", CASE_IDS)
def test_answer_does_not_contradict_written_policy(case_id):
    g = golden(case_id)
    assert_test(
        LLMTestCase(
            input=g["question"],
            actual_output=g["answer"],
            retrieval_context=g["retrieved"],
            context=g["retrieved"],
        ),
        [HallucinationMetric(threshold=0.2)],
    )


@pytest.mark.skip(reason="MissingTestCaseParamsError since 2026-06-19, see #812")
def test_retrieval_covers_the_answer_we_expect():
    g = golden("refund-window")
    assert_test(
        LLMTestCase(
            input=g["question"],
            actual_output=g["answer"],
            retrieval_context=g["retrieved"],
        ),
        [ContextualRecallMetric(threshold=0.7)],
    )


def test_answer_addresses_the_question():
    g = golden("seat-removal")
    assert_test(
        LLMTestCase(input=g["question"], actual_output=g["answer"]),
        [AnswerRelevancyMetric(threshold=0.7)],
    )

=============== FILE: data/policy-goldens.json ===============
[
  {
    "id": "refund-window",
    "question": "How long have I got to send this back?",
    "answer": "You have 60 days from the date of purchase to request a full refund.",
    "retrieved": [
      "Customers may request a full refund within 60 days of purchase.",
      "Refunds are issued to the original payment method within 5 business days."
    ],
    "expected_answer": "You have 30 days from the date of purchase to request a full refund."
  },
  {
    "id": "seat-removal",
    "question": "How do I take a seat off our plan?",
    "answer": "An account owner can remove a seat from Settings then Members. The licence frees up straight away and your bill adjusts next period.",
    "retrieved": [
      "An account owner can remove a seat from Settings > Members.",
      "Removing a seat frees the licence immediately; billing adjusts on the next invoice."
    ],
    "expected_answer": "An account owner removes a seat from Settings > Members; the licence is released immediately and billing adjusts on the next invoice."
  },
  {
    "id": "data-export",
    "question": "Can I get everything we have stored exported?",
    "answer": "Yes. An owner can start a full export from Settings then Data, and we email a download link when it is ready.",
    "retrieved": [
      "Account owners can start a full data export from Settings > Data.",
      "A download link is emailed when the export completes."
    ],
    "expected_answer": "An account owner can start a full export from Settings > Data; a download link is emailed on completion and expires after 72 hours."
  }
]

=============== FILE: docs/policy-handbook-extract.md ===============
# Customer policy handbook, extract, revision 2026-07 (legal-approved)

Authoritative. Where the help centre and this document disagree, this document
is correct and the help-centre article is raised as a defect.

## 4. Refunds

- **4.1** A customer may request a full refund within **30 days** of the
  purchase date.
- **4.2** Requests after 30 days are handled as goodwill at the discretion of
  the support lead and are not an entitlement.
- **4.3** Approved refunds are issued to the original payment method within 5
  business days.

## 7. Seats

- **7.2** Seat removal is available to account owners from Settings > Members.
- **7.4** A removed seat is released immediately and prorated on the following
  invoice.

## 9. Data export

- **9.1** Account owners may request a full export of account data from
  Settings > Data.
- **9.2** Export links are emailed on completion and expire after 72 hours.

=============== FILE: reports/issue-812-pytest-output.txt ===============
pytest tests/llm/test_policy_grounding.py -q    2026-06-19, before the skips were added

=================================== ERRORS ====================================
___ ERROR at test_answer_does_not_contradict_written_policy[refund-window] ____
deepeval.errors.MissingTestCaseParamsError: Unable to evaluate test case because
'context' is missing. Provide the missing parameter(s), or pass
--skip-on-missing-params to skip evaluating this test case.
_____________ ERROR at test_retrieval_covers_the_answer_we_expect _____________
deepeval.errors.MissingTestCaseParamsError: Unable to evaluate test case because
'expected_output' is missing. Provide the missing parameter(s), or pass
--skip-on-missing-params to skip evaluating this test case.
========================= 4 passed, 4 errors in 96.12s =========================

=============== FILE: reports/run-2026-09-10.txt ===============
pytest tests/llm/test_policy_grounding.py -q    2026-09-10, most recent run

tests/llm/test_policy_grounding.py::test_answer_is_supported_by_retrieved_chunks[refund-window] PASSED
tests/llm/test_policy_grounding.py::test_answer_is_supported_by_retrieved_chunks[seat-removal] PASSED
tests/llm/test_policy_grounding.py::test_answer_is_supported_by_retrieved_chunks[data-export] PASSED
tests/llm/test_policy_grounding.py::test_answer_does_not_contradict_written_policy[refund-window] PASSED
tests/llm/test_policy_grounding.py::test_answer_does_not_contradict_written_policy[seat-removal] PASSED
tests/llm/test_policy_grounding.py::test_answer_does_not_contradict_written_policy[data-export] PASSED
tests/llm/test_policy_grounding.py::test_retrieval_covers_the_answer_we_expect SKIPPED
tests/llm/test_policy_grounding.py::test_answer_addresses_the_question PASSED
========================= 7 passed, 1 skipped in 104.38s ======================

=============== FILE: requirements.txt ===============
deepeval==3.2.6
pytest==8.3.3
