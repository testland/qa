# The nightly never finishes, and the bit that does finish pages us at 04:00

## Problem Description

Two things about the nightly run on the sales assistant, and I would like both
dealt with in one pass.

First: it does not finish. The runner is capped at 120 minutes and the job has
been killed mid-run on eleven of the last fourteen nights, usually somewhere
around case 70 of 140. So most mornings there is no report at all, and the three
nights it did finish are the only data anyone has. The cap is not mine to move;
the platform team set it and the rules they work to are attached.

Dev on my team has a patch up for this already — it is attached as
`reports/proposed-patch.diff` — and I would take it today if it worked. Give me a
verdict on it either way, because he will ask.

Second: on the three nights it did finish, the same four cases failed their
grounding bar, and each failure paged whoever was on call at 04:00. Three
separate people have now been woken for the same four cases. The rota is
threatening to mute the channel, which would be worse than what we have. The
team's ask, which I am passing on as they wrote it: "drop the grounding bar from
0.7 to 0.3 so the nightly stops crying wolf, and take those four out of the
paging path until search-platform get to them."

Attached: the workflow, the suite, the first ten rows of the goldens file (the
real one is 140 rows in the same shape), the run history with per-case scores for
those four cases, the platform rules, the proposed patch, and the ownership
table.

## Output Specification

1. Edit `.github/workflows/nightly-llm-eval.yml` so that a full run of the corpus
   finishes inside the runner cap and produces a report.
2. Apply your decision on the team's ask to `tests/llm/test_assistant_suite.py`
   and to anything else it touches.
3. Write `docs/nightly-run-decision.md`: what you changed and why, with the
   arithmetic showing the run now fits; your verdict on the attached patch; your
   answer on each part of the team's ask with the evidence behind it; and what
   happens at 04:00 from now on.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/nightly-llm-eval.yml ===============
name: nightly-llm-eval

on:
  schedule:
    - cron: "40 1 * * *"
  workflow_dispatch:

jobs:
  eval:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - name: Quality suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: python -m pytest tests/llm -q
      - name: Page on-call
        if: failure()
        run: ./scripts/page-oncall.sh "nightly-llm-eval failed"

=============== FILE: tests/llm/test_assistant_suite.py ===============
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

=============== FILE: docs/platform-constraints.md ===============
# Scheduled workflow rules — platform team, revision 2026-08

- `timeout-minutes` is 120 for every scheduled workflow in the org. Raising it
  requires a platform exception. Two requests from this team have been declined.
- `requirements.txt` is generated from the org approved-package manifest. A
  package that is not already on the manifest goes through security review before
  it can be added; current turnaround is three weeks and there is no expedite
  path.
- Runners are 4 vCPU, 16 GB. No self-hosted pool is available to this team.
- Judge-model API quota for this org: 50 requests in flight, org-wide. We are
  nowhere near it; the assistant team's nightly is the only scheduled consumer.

=============== FILE: reports/proposed-patch.diff ===============
From: dev@example.com
Subject: [PATCH] nightly: run the suite in parallel so it fits the cap

Tested locally on a 10-golden slice, wall clock dropped roughly 8x. Should take
us comfortably under the cap on the full corpus.

--- a/.github/workflows/nightly-llm-eval.yml
+++ b/.github/workflows/nightly-llm-eval.yml
@@
       - name: Quality suite
         env:
           OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
-        run: python -m pytest tests/llm -q
+        run: python -m pytest tests/llm -q -n auto

--- a/requirements.txt
+++ b/requirements.txt
@@
 deepeval==3.2.6
 pytest==8.3.3
+pytest-xdist==3.6.1

=============== FILE: data/goldens.jsonl ===============
{"id": "trial-length", "capability": "onboarding", "question": "How long is the free trial?", "answer": "The free trial runs for 14 days and does not need a card.", "chunks": ["Free trials run for 14 days.", "No payment method is required to start a trial."]}
{"id": "trial-extend", "capability": "onboarding", "question": "Can we get more time on the trial?", "answer": "Ask your account manager; trials can be extended once by 14 days.", "chunks": ["Trials may be extended once, by up to 14 days, at the account manager's discretion."]}
{"id": "seat-add", "capability": "seats", "question": "How do we add someone mid-month?", "answer": "An owner adds them from Settings then Members; the new seat is prorated on the next invoice.", "chunks": ["Owners add members from Settings > Members.", "New seats are prorated on the following invoice."]}
{"id": "seat-remove", "capability": "seats", "question": "And removing someone?", "answer": "Same place. The licence frees immediately and billing adjusts next invoice.", "chunks": ["Owners remove members from Settings > Members.", "A removed seat is released immediately and prorated on the following invoice."]}
{"id": "tier-growth-price", "capability": "pricing-tiers", "question": "What does the Growth tier cost?", "answer": "Growth is 49 dollars per seat per month on an annual commitment.", "chunks": ["Frequently asked: how do I compare plans? Use the plan comparison page.", "Frequently asked: can I change plan mid-term? Yes, from Settings > Billing."]}
{"id": "tier-growth-limits", "capability": "pricing-tiers", "question": "Any limits on Growth?", "answer": "Growth includes 50 projects and 100 GB of storage per account.", "chunks": ["Frequently asked: where do I see my usage? Settings > Usage.", "Frequently asked: what happens at the limit? You are asked to upgrade."]}
{"id": "tier-scale-price", "capability": "pricing-tiers", "question": "And the Scale tier?", "answer": "Scale is 89 dollars per seat per month, annual only.", "chunks": ["Frequently asked: do you offer nonprofit pricing? Contact sales.", "Frequently asked: can I pay monthly? Growth only."]}
{"id": "tier-downgrade", "capability": "pricing-tiers", "question": "Can we move back down a tier?", "answer": "Yes, at renewal. Mid-term downgrades are not available on annual plans.", "chunks": ["Frequently asked: how do I change plan? Settings > Billing.", "Frequently asked: when do changes apply? At the start of the next period."]}
{"id": "sso-setup", "capability": "security", "question": "Do you support SSO?", "answer": "Yes, SAML SSO is available on Scale and is configured from Settings then Security.", "chunks": ["SAML SSO is available on the Scale tier.", "SSO is configured from Settings > Security."]}
{"id": "data-region", "capability": "security", "question": "Where is our data stored?", "answer": "Accounts are pinned to the region chosen at signup: EU, US or AP.", "chunks": ["Account data is stored in the region selected at signup.", "Available regions are EU, US and AP."]}

=============== FILE: reports/nightly-runs.md ===============
# nightly-llm-eval, last 14 nights

| Night      | Outcome                 | Cases completed | Wall clock |
|------------|-------------------------|-----------------|------------|
| 2026-08-31 | killed at cap           | 68 / 280        | 120m       |
| 2026-09-01 | killed at cap           | 71 / 280        | 120m       |
| 2026-09-02 | killed at cap           | 70 / 280        | 120m       |
| 2026-09-03 | completed, failed       | 280 / 280       | 221m (manual re-run, cap lifted for one night) |
| 2026-09-04 | killed at cap           | 69 / 280        | 120m       |
| 2026-09-05 | killed at cap           | 73 / 280        | 120m       |
| 2026-09-06 | completed, failed       | 280 / 280       | 218m (manual re-run, cap lifted for one night) |
| 2026-09-07 | killed at cap           | 66 / 280        | 120m       |
| 2026-09-08 | killed at cap           | 70 / 280        | 120m       |
| 2026-09-09 | killed at cap           | 72 / 280        | 120m       |
| 2026-09-10 | completed, failed       | 280 / 280       | 224m (manual re-run, cap lifted for one night) |
| 2026-09-11 | killed at cap           | 67 / 280        | 120m       |
| 2026-09-12 | killed at cap           | 71 / 280        | 120m       |
| 2026-09-13 | killed at cap           | 70 / 280        | 120m       |

280 results per full run: 140 goldens x 2 checks. Each result is one judge call.
Runner metrics for the completed nights: CPU 3-6%, memory 1.2 GB peak, network
idle between calls.

## The four that fail on a completed night

| Case               | grounding 09-03 | 09-06 | 09-10 | relevancy 09-03 | 09-06 | 09-10 |
|--------------------|-----------------|-------|-------|-----------------|-------|-------|
| tier-growth-price  | 0.31            | 0.29  | 0.30  | 0.94            | 0.92  | 0.95  |
| tier-growth-limits | 0.34            | 0.33  | 0.36  | 0.91            | 0.93  | 0.90  |
| tier-scale-price   | 0.28            | 0.31  | 0.29  | 0.96            | 0.94  | 0.95  |
| tier-downgrade     | 0.35            | 0.33  | 0.34  | 0.88            | 0.90  | 0.89  |

Both bars are 0.70. All 276 other results were above 0.70 on all three completed
nights.

=============== FILE: docs/ownership.md ===============
# Who owns what — assistant programme

| Surface                             | Team             | Lead     |
|-------------------------------------|------------------|----------|
| Assistant prompts and responses     | @assistant-core  | @lmurray |
| Eval suite, goldens, nightly job     | @assistant-core | @lmurray |
| Retrieval index, chunking, rebuilds  | @search-platform| @nsato   |
| Help-centre and pricing content      | @content-ops    | @dwhite  |
| CI runners, workflow policy          | @platform       | @ahassan |

Index rebuilds land on the third Tuesday of the month and are announced in
#search-platform. The August rebuild was the most recent.

=============== FILE: requirements.txt ===============
deepeval==3.2.6
pytest==8.3.3
