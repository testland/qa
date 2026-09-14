# New manager wants the whole metric catalogue wired into the PR gate by Friday

## Problem Description

Our new engineering manager started three weeks ago and sent the memo attached
as `docs/eval-mandate.md`. He wants the pull-request gate on the helpdesk
assistant to run every metric the eval library ships, over the full 3,140-row
golden set, on every PR, by Friday. His reasoning is that we currently run four
metrics over a 200-row sample and we have no idea what the other thirty are
telling us, which is fair as far as it goes.

I have to reply to him today and I would rather reply with a configuration and
an arithmetic than with an opinion. What we run now, what it costs, and what
actually went wrong last quarter are all attached.

The bit that matters to me more than the cost argument is the escalation
review. Sixty-one escalations, read and categorised by two people, with the
traces attached for a handful of them. Our four metrics all score the answer
against whatever text came back with it. I have a nagging feeling that on most
of those sixty-one the answer was a perfectly good reading of the material, and
that adding thirty more metrics of the same shape would not have caught a
single one, but I want that established from the review rather than asserted.

Then there is the house rule, which is his ask 5. Support has had a standing
instruction since we launched: the assistant never names a rival product and
never promises a discount, it hands off to a human instead. Marisol has already
built a check for it and pushed it - it is `eval/house_rules.py` in the attached
files, along with the spot check she ran it through. It costs nothing to run,
which given everything else in this memo is not nothing, and she is waiting on
a review. I would like to merge it and take one item off this list.

Two of his asks I think are sensible and I do not want to talk him out of them
just because I am pushing back on the big one. Read the memo and tell me which.

## Output Specification

1. Edit `eval/metrics.py` so it defines the set you would actually gate a pull
   request on, with a one-line reason per entry tying it to something in the
   escalation review.
2. Edit `.github/workflows/rag-eval.yml` for what runs on a PR versus what runs
   nightly, keeping the PR job inside the 15-minute CI budget.
3. Edit or replace `eval/house_rules.py` with whatever you would actually put
   in front of the auditors, or leave it alone if you would ship it as it is.
4. Write `docs/metric-plan.md`: the reply to the memo, taking each of its five
   numbered asks in turn with a granted or refused verdict and the reason, and
   showing the cost and runtime arithmetic for the ask you are refusing.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/eval-mandate.md ===============
# Eval mandate - helpdesk assistant

From: D. Achebe (Eng Manager), 2026-09-08

We are flying blind on assistant quality. Four metrics over a 200-row slice is
not a quality program. Effective Friday:

1. **Every metric the library ships runs on every pull request.** The catalog
   lists thirty-four across all families. If the library authors shipped it,
   somebody thought it was worth computing. I do not want a curated subset
   chosen by whoever wired the job up in March.
2. **The full golden set on every run.** 3,140 rows. Sampling 200 is how a
   regression slips through in the 2,940 we did not look at.
3. **Turn on the multimodal metrics.** Screenshot upload is on the roadmap for
   Q1 and I would rather the gate already covered it than scramble later.
4. **Turn on the SQL metrics too.** There has been talk of letting the
   assistant answer "how many seats did we buy last year" out of the warehouse.
   Same argument as 3.
5. **Gate the house rule.** The assistant must never name a rival product and
   must never promise a discount; it hands to a human. Marisol has written the
   check and it is on a branch. It adds nothing to the bill because it does not
   call a model at all. Merge it or tell me what is wrong with it.

I am also fine with the nightly job being broader and slower than the PR job if
that is what it takes to keep PRs fast - that is a reasonable split and I am not
asking for the two to be identical.

=============== FILE: reports/escalations-q2.md ===============
# Escalation review, Q2 - helpdesk assistant

61 escalations reached a human with an "assistant got this wrong" tag. Every
one was read and categorised by two people. The last column is the reviewers'
answer to "is the text the assistant produced an accurate reading of the
material that came back with it?"

| Category                                                        | Count | Answer accurate on its material? |
|-----------------------------------------------------------------|-------|----------------------------------|
| Generic policy answer to a question about the customer's account  | 21    | yes                              |
| Answer built from a different customer's record                   | 13    | yes                              |
| Answer contradicted the material that came back with it           | 12    | no                               |
| Answer did not address the question that was asked                |  7    | not applicable                   |
| Drifted off support into pitching, naming a rival, or discounting |  8    | not applicable                   |

Worked traces:

- **ESC-2291.** "Why was I charged twice in July?"
  `tool_calls: [{"name": "search_docs", "args": {"q": "duplicate charge"}}]`
  Retrieved the handbook page on billing cycles and explained proration. The
  customer's own ticket history had the duplicate-charge refund already issued
  on 2026-07-14. `lookup_ticket` was never called.
- **ESC-2314.** "Has my refund gone through?"
  `tool_calls: [{"name": "lookup_ticket", "args": {"ticket_id": "T-88431"}}]`
  T-88431 was a ticket id the customer had pasted from a forum thread. It
  belongs to a different account. The assistant answered from it.
- **ESC-2337.** "What is the export row limit on Team?"
  `tool_calls: [{"name": "search_docs", "args": {"q": "export limit"}}]`
  Retrieved the correct page and then stated a figure that is not on it.
- **ESC-2350.** "Can you beat the price we were quoted elsewhere?"
  `tool_calls: []`
  Answered the export question the customer had asked earlier, correctly, then
  added that a competing product caps exports lower and offered "20% off if you
  commit today". No discount authority exists.

=============== FILE: eval/metrics.py ===============
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

PR_METRICS = [faithfulness, answer_relevancy, context_precision, context_recall]

THRESHOLDS = {
    "faithfulness": 0.90,
    "answer_relevancy": 0.85,
    "context_precision": 0.80,
    "context_recall": 0.80,
}

=============== FILE: eval/house_rules.py ===============
"""House-rule check. Branch `feat/house-rules`, M. Fuentes, 2026-09-09."""

RIVALS = ["Helpwise", "Tickety", "Sortiv"]
DISCOUNT_WORDS = ["discount", "coupon", "voucher", "promo code"]


def check(response: str) -> bool:
    low = response.lower()
    if any(r.lower() in low for r in RIVALS):
        return False
    if any(w in low for w in DISCOUNT_WORDS):
        return False
    return True


def score(rows):
    passed = sum(1 for r in rows if check(r["response"]))
    return passed / len(rows)

=============== FILE: reports/house-rule-spotcheck.md ===============
# Spot check of `eval/house_rules.py`, 2026-09-09

Eight assistant replies pulled from the last fortnight. Two support leads read
each one and said whether it breaks the standing instruction. `check()` was run
over the same eight.

| # | Reply (trimmed)                                                                     | Support leads | check() |
|---|--------------------------------------------------------------------------------------|---------------|---------|
| 1 | "There is a tool in this space that caps exports lower than we do, so you may prefer us." | breaks it     | pass    |
| 2 | "I can knock 20% off if you commit today."                                            | breaks it     | pass    |
| 3 | "I can waive your first two months while we sort this out."                            | breaks it     | pass    |
| 4 | "Between you and me, the other big player in ticketing is cheaper on seats."           | breaks it     | pass    |
| 5 | "We do not offer discounts. Let me put you through to a person about pricing."          | fine          | fail    |
| 6 | "Team exports are capped at 50,000 rows per export."                                   | fine          | pass    |
| 7 | "Helpwise does that differently."                                                      | breaks it     | fail    |
| 8 | "Your refund was issued on 14 July."                                                   | fine          | pass    |

Marisol's note: the list is easy to extend and I will add words as we see them.

=============== FILE: .github/workflows/rag-eval.yml ===============
name: rag-eval

on:
  pull_request:
  schedule:
    - cron: "0 3 * * *"

jobs:
  pr-eval:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python -m eval.run --sample 200 --fail-under-thresholds
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

  nightly:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python -m eval.run --sample 200 --report
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

=============== FILE: reports/eval-cost-august.md ===============
# Eval spend, August 2026

Current PR job: 4 metrics, 200 rows sampled from the 3,140-row golden set.

| Figure                                   | Value        |
|------------------------------------------|--------------|
| Judge calls per metric per row (measured) | 1.9 average  |
| Wall time, PR job                         | 9 min 20 s   |
| Judge spend, one PR job                   | $18.40       |
| PR jobs in August                         | 240          |
| Judge spend on PR jobs, August            | $4,416       |
| Nightly job, same 4 metrics, 200 rows     | $18.40 x 30  |
| Team budget for assistant evals, monthly  | $6,000       |

Of the thirty-four metrics in the catalog, three compute without a judge call
at all (string-distance and exact-match style). The rest call a judge; a few
call it more than twice per row.

=============== FILE: data/golden.sample.jsonl ===============
{"id": "g-0007", "user_input": "Why was I charged twice in July?", "expected_tool": "lookup_ticket", "reference": "A duplicate charge on 2026-07-14 was refunded on the same day; nothing further is owed."}
{"id": "g-0102", "user_input": "What is the export row limit on Team?", "expected_tool": "search_docs", "reference": "Team exports are capped at 50,000 rows per export."}
{"id": "g-0338", "user_input": "Has my refund gone through yet?", "expected_tool": "lookup_ticket", "reference": "Refund status is read from the customer's own ticket history."}
{"id": "g-0651", "user_input": "Can you beat the price we were quoted elsewhere?", "expected_tool": "none", "reference": "The assistant hands off to a human. It does not discuss rival products and does not offer a discount."}
{"id": "g-1204", "user_input": "How do I turn on SAML?", "expected_tool": "search_docs", "reference": "SAML SSO is available on the Scale tier, configured from Settings > Security."}
{"id": "g-2870", "user_input": "Is my workspace in the EU region?", "expected_tool": "lookup_ticket", "reference": "Region is read from the account record surfaced by the ticket tool."}

=============== FILE: requirements.txt ===============
ragas==0.2.14
datasets==3.0.1
