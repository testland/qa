---
component: relevance-regression-reviewer
type: agent
---

# relevance-regression-reviewer - evals

Companion eval cases for [`relevance-regression-reviewer`](../../relevance-regression-reviewer.md).
Three cases cover happy path / branch / adversarial: head-query regression
(verdict `🟡 NEEDS-WORK` / refuse-to-approve), a clean aggregate gain
(verdict `✅ improvement`), and a stale-judgment refusal (judgments
out of date with the index - refuse to evaluate). Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

## Eval 1 - happy path - head query regression (refuse to approve)

**Input:**

```
Review this PR.

Change: Synonym dictionary expanded for "running" (bidirectional →
jogging, sprint, marathon). The PR diff modifies
config/synonyms/en.txt only.

Judgment list: 247 queries, 1,892 judgments, 5% unrated avg.

Test set: _rank_eval with NDCG@10.

before.json:
{
  "metric_score": 0.834,
  "details": {
    "running_socks":         {"metric_score": 0.84, "unrated_docs": []},
    "cross_country_running": {"metric_score": 0.76, "unrated_docs": []},
    "marathon_shoes":        {"metric_score": 0.62, "unrated_docs": []},
    "sprint_trainers":       {"metric_score": 0.58, "unrated_docs": []}
  }
}

after.json:
{
  "metric_score": 0.829,
  "details": {
    "running_socks":         {"metric_score": 0.71, "unrated_docs": []},
    "cross_country_running": {"metric_score": 0.65, "unrated_docs": []},
    "marathon_shoes":        {"metric_score": 0.79, "unrated_docs": []},
    "sprint_trainers":       {"metric_score": 0.71, "unrated_docs": []}
  }
}

"running_socks" and "cross_country_running" are head queries (top 10
by traffic).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 aggregate delta is -0.005 (within the
`-0.01 to +0.02` "essentially flat" band, but Step 3 must override).
Step 3 per-query analysis shows `running_socks` (-0.13) and
`cross_country_running` (-0.11) - two head queries dropped > 0.05 AND
> 0.10. Per Step 9 refuse rules ("Any head query dropped > 0.05"), the
agent refuses to ✅. Verdict line is `🟡 NEEDS-WORK` (or `❌ block` - 
both are refuse-to-approve outcomes per Step 2 and Step 9). Output
explains asymmetric synonym mapping ("marathon → running" one-way)
as the recommended fix.

**Pass condition:** Output contains the literal string `NEEDS-WORK`
OR `block` (the two refuse-to-approve verdicts) AND mentions at least
one of `running_socks`, `cross_country_running`, or `head query` (the
per-query regression signal). Output does NOT contain a `✅ improvement`
or standalone `✅ approve` verdict.

## Eval 2 - branch - clean aggregate gain (approve)

**Input:**

```
Review this PR.

Change: Term-based query template tweak — boost product title field
from ^2.0 to ^2.5 in the multi_match query. The PR diff modifies
search/templates/product_search.json only.

Judgment list: 180 queries, 1,420 judgments, 3% unrated avg.

Test set: _rank_eval with NDCG@10.

before.json:
{
  "metric_score": 0.781,
  "details": {
    "blue_jeans":     {"metric_score": 0.72, "unrated_docs": []},
    "wireless_mouse": {"metric_score": 0.81, "unrated_docs": []},
    "yoga_mat":       {"metric_score": 0.78, "unrated_docs": []},
    "coffee_table":   {"metric_score": 0.79, "unrated_docs": []}
  }
}

after.json:
{
  "metric_score": 0.812,
  "details": {
    "blue_jeans":     {"metric_score": 0.76, "unrated_docs": []},
    "wireless_mouse": {"metric_score": 0.83, "unrated_docs": []},
    "yoga_mat":       {"metric_score": 0.81, "unrated_docs": []},
    "coffee_table":   {"metric_score": 0.81, "unrated_docs": []}
  }
}

No head-query regressions; no per-query drops > 0.05.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 aggregate delta is +0.031 (≥ +0.02 → `✅
improvement`). Step 3 per-query analysis: every query improved or
held flat; zero per-query drops > 0.10; zero head-query drops > 0.05.
Step 4 unrated check passes (3% unrated avg < 30% threshold). Per
Step 9 refuse rules, none of the refuse conditions trigger. Verdict
line is `✅ improvement` / `✅ approve`.

**Pass condition:** Output contains the literal string `improvement`
OR a standalone `✅` line indicating approval AND does NOT contain
`NEEDS-WORK` or `block`. The aggregate delta `+0.031` (or `0.031`,
rounded) appears in the report.

## Eval 3 - adversarial - stale judgments (refuse to evaluate)

**Input:**

```
Review this PR.

Change: Mappings update — `description` field analyzer changed from
`standard` to `english` (stemming enabled). The PR diff modifies
mappings/products.json only.

Judgment list: 312 queries, 2,100 judgments — last updated 2024-08-14
(20 months ago).

Test set: _rank_eval with NDCG@10.

before.json:
{
  "metric_score": 0.701,
  "details": {
    "q_001": {"metric_score": 0.62, "unrated_docs": ["d101", "d102", "d103", "d104", "d105", "d106"]},
    "q_002": {"metric_score": 0.55, "unrated_docs": ["d201", "d202", "d203", "d204", "d205", "d206", "d207"]},
    "q_003": {"metric_score": 0.71, "unrated_docs": ["d301", "d302", "d303", "d304", "d305", "d306"]},
    "q_004": {"metric_score": 0.49, "unrated_docs": ["d401", "d402", "d403", "d404", "d405", "d406", "d407"]}
  }
}

after.json:
{
  "metric_score": 0.694,
  "details": {
    "q_001": {"metric_score": 0.59, "unrated_docs": ["d101", "d102", "d103", "d104", "d105", "d106", "d107"]},
    "q_002": {"metric_score": 0.58, "unrated_docs": ["d201", "d202", "d203", "d204", "d205", "d206", "d207", "d208"]},
    "q_003": {"metric_score": 0.68, "unrated_docs": ["d301", "d302", "d303", "d304", "d305", "d306"]},
    "q_004": {"metric_score": 0.51, "unrated_docs": ["d401", "d402", "d403", "d404", "d405", "d406", "d407", "d408"]}
  }
}

k = 10 in our _rank_eval config.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 4 unrated check fails - every query in the after
set has ≥ 6 of 10 top-k results unrated (60 - 80%). That is well above
the 50% per-query threshold AND well above the 30% across-queries
threshold (here 100% of queries exceed the per-query 50% threshold).
Per Step 9 Refuse-to-proceed rule "> 30% of queries have > 50%
unrated docs", the agent refuses to evaluate. The judgment list is
20 months stale; the agent recommends refreshing judgments (per Step
4) before re-running the review. The agent does NOT emit a final
`✅ improvement` / `🟡 NEEDS-WORK` / `❌ block` verdict - it refuses
because the metric is meaningless against stale judgments.

**Pass condition:** Output contains the literal string `unrated`
AND at least one of `refresh`, `stale`, or `judgment` (the
judgment-refresh recommendation). Output does NOT contain a standalone
`✅ improvement` verdict line, AND does NOT contain a definitive
`❌ block` verdict for the *relevance* outcome (the agent's refusal
is about judgment-coverage, not relevance regression).

## Reproducibility notes

- All three inputs are concrete pasted JSON snippets - no external
  rank_eval API calls, no need to clone a sample index.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 D7 sub-checks
  (Evals exist, Multi-model coverage, Acceptance criteria, Adversarial
  coverage, Reproducibility).
