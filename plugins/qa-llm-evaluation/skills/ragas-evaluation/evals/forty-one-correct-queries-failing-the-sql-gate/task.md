# The analytics copilot gate fails 41 of 50 queries that return the right rows

## Problem Description

`ask-analytics` takes a question, retrieves the schema notes and metric
definitions for the tables involved, and writes a query against the warehouse.
It has been in front of the finance and ops teams since June and they like it.

The gate on it has been red since the day it was built. Fifty cases, each with
a reference query written by the data team, and the run reports 9 of 50. So
nobody looks at it any more, which is the actual problem: the thing has been
effectively ungated for three months and we are about to let it write queries
for the board pack.

An analyst spent last week running both queries for every failing case against
a restored production snapshot and comparing what came back, case by case. That
review is attached with the row counts she got. It is not 41 broken queries.
Most of them are the same query written by somebody with different habits - a
different alias, the joins in a different order, a CTE where the data team
wrote a subquery, `BETWEEN` where the data team wrote two comparisons.

Three fixes are on the table.

Two of them are old. Strip whitespace, lowercase everything and compare, which
somebody already tried. Or score the generated query against the reference by
text similarity and pass anything above 0.9, which was tried on a branch and
whose numbers are in the review.

The third is Yusuf's and it is the one being pushed, because it is written and
it works. He stopped comparing the query text at all and compares what the
queries return: both queries run, the result sets get sorted and diffed, and
the case passes if they match. He wired it to the dev snapshot we keep in CI so
it runs on every PR without touching production. It takes the gate from 9 of 50
to 48 of 50 and he wants to merge it today. His run output and the manifest for
the snapshot he runs against are attached.

There is also `docs/query-house-rules.md`, which the data team wrote when we
launched and which nothing currently checks. Both rules in it matter to our
auditors and I want the gate to have an opinion on them rather than a wiki page
nobody reads.

## Output Specification

1. Rewrite `eval/sql_eval.py`. After your change, queries that are the same
   query written differently must pass, queries that are not must fail, and the
   house rules must be enforced by the gate rather than by a document.
2. Do not edit `data/sql_cases.jsonl`. The reference queries are the data
   team's and I want your gate scored against the cases exactly as they stand.
3. Write `docs/sql-eval-verdict.md`: a case-by-case verdict on every case you
   are calling a true failure and the evidence for it, a granted-or-refused
   verdict on each of the three proposed fixes, and how the house rules are
   enforced.

## Input Files

Extract the following files before beginning.

=============== FILE: eval/sql_eval.py ===============
import json
import pathlib

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import ExactMatch

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_cases():
    text = (ROOT / "data" / "sql_cases.jsonl").read_text(encoding="utf-8")
    rows = [json.loads(line) for line in text.splitlines() if line.strip()]
    return Dataset.from_list(
        [
            {
                "user_input": r["user_input"],
                "response": r["response"].strip(),
                "reference": r["reference"].strip(),
            }
            for r in rows
        ]
    )


def main():
    result = evaluate(load_cases(), metrics=[ExactMatch()])
    print(result)
    assert result["exact_match"] >= 0.95, f"sql gate: {result}"


if __name__ == "__main__":
    main()

=============== FILE: data/sql_cases.jsonl ===============
{"id": "q-04", "user_input": "How many seats did each tenant buy last quarter?", "reference": "SELECT tenant_id, SUM(seats) AS seats FROM analytics.orders WHERE tenant_id = :tenant AND ordered_at >= '2026-04-01' AND ordered_at < '2026-07-01' GROUP BY tenant_id", "response": "SELECT o.tenant_id, SUM(o.seats) AS seats FROM analytics.orders o WHERE o.tenant_id = :tenant AND o.ordered_at BETWEEN '2026-04-01' AND '2026-06-30' GROUP BY o.tenant_id"}
{"id": "q-11", "user_input": "What is average ticket resolution time by team?", "reference": "SELECT t.team, AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at))/3600) AS hours FROM analytics.tickets t WHERE t.tenant_id = :tenant AND t.closed_at IS NOT NULL GROUP BY t.team", "response": "WITH closed AS (SELECT team, closed_at, created_at FROM analytics.tickets WHERE tenant_id = :tenant AND closed_at IS NOT NULL) SELECT team, AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600) AS hours FROM closed GROUP BY team"}
{"id": "q-19", "user_input": "How many active customers do we have in the EU region?", "reference": "SELECT COUNT(*) AS customers FROM analytics.customers_masked_v WHERE tenant_id = :tenant AND region = 'EU' AND status = 'active'", "response": "SELECT COUNT(*) AS customers FROM analytics_pii.customers_v WHERE tenant_id = :tenant AND region = 'EU' AND status = 'active'"}
{"id": "q-23", "user_input": "Which plans had the most upgrades in August?", "reference": "SELECT p.name, COUNT(*) AS upgrades FROM analytics.upgrades u JOIN analytics.plans p ON p.id = u.to_plan_id WHERE u.tenant_id = :tenant AND u.upgraded_at >= '2026-08-01' AND u.upgraded_at < '2026-09-01' GROUP BY p.name ORDER BY upgrades DESC", "response": "SELECT plans.name, COUNT(*) AS upgrades FROM analytics.plans plans JOIN analytics.upgrades u ON u.to_plan_id = plans.id WHERE u.tenant_id = :tenant AND u.upgraded_at >= '2026-08-01' AND u.upgraded_at < '2026-09-01' GROUP BY plans.name ORDER BY upgrades DESC"}
{"id": "q-27", "user_input": "How many refunds were issued last month?", "reference": "SELECT COUNT(*) AS refunds FROM analytics.refunds WHERE tenant_id = :tenant AND issued_at >= '2026-08-01' AND issued_at < '2026-09-01'", "response": "SELECT COUNT(*) AS refunds FROM analytics.refunds WHERE issued_at >= '2026-08-01' AND issued_at < '2026-09-01'"}
{"id": "q-33", "user_input": "How many tickets did we close in August?", "reference": "SELECT COUNT(*) AS closed FROM analytics.tickets WHERE tenant_id = :tenant AND closed_at >= '2026-08-01' AND closed_at < '2026-09-01'", "response": "SELECT COUNT(*) AS closed FROM analytics.tickets WHERE tenant_id = :tenant AND created_at >= '2026-08-01' AND created_at < '2026-09-01'"}
{"id": "q-38", "user_input": "Total revenue by month this year", "reference": "SELECT DATE_TRUNC('month', paid_at) AS month, SUM(amount_cents)/100.0 AS revenue FROM analytics.payments WHERE tenant_id = :tenant AND paid_at >= '2026-01-01' GROUP BY 1 ORDER BY 1", "response": "SELECT DATE_TRUNC('month', p.paid_at) AS month, SUM(p.amount_cents)/100.0 AS revenue FROM analytics.payments p WHERE p.tenant_id = :tenant AND p.paid_at >= '2026-01-01' GROUP BY DATE_TRUNC('month', p.paid_at) ORDER BY 1"}
{"id": "q-40", "user_input": "Top 5 plans by revenue this month", "reference": "SELECT p.name, SUM(pay.amount_cents)/100.0 AS revenue FROM analytics.payments pay JOIN analytics.plans p ON p.id = pay.plan_id WHERE pay.tenant_id = :tenant AND pay.paid_at >= '2026-09-01' GROUP BY p.name ORDER BY revenue DESC LIMIT 5", "response": "SELECT p.name, SUM(pay.amount_cents)/100.0 AS revenue FROM analytics.payments pay JOIN analytics.plans p ON p.id = pay.plan_id WHERE pay.tenant_id = :tenant AND pay.paid_at >= '2026-09-01' GROUP BY p.name ORDER BY 2 DESC LIMIT 5"}
{"id": "q-44", "user_input": "How many orders were placed yesterday?", "reference": "SELECT COUNT(*) AS orders FROM analytics.orders WHERE tenant_id = :tenant AND ordered_at::date = CURRENT_DATE - 1", "response": "SELECT COUNT(*) AS orders FROM analytics.orders_v WHERE tenant_id = :tenant AND ordered_at::date = CURRENT_DATE - 1"}
{"id": "q-46", "user_input": "How many seats are unassigned per workspace?", "reference": "SELECT w.name, w.seats_purchased - COUNT(m.id) AS unassigned FROM analytics.workspaces w LEFT JOIN analytics.members m ON m.workspace_id = w.id WHERE w.tenant_id = :tenant GROUP BY w.name, w.seats_purchased", "response": "SELECT w.name, w.seats_purchased - COUNT(m.id) AS unassigned FROM analytics.workspaces w LEFT JOIN analytics.members m ON m.workspace_id = w.id WHERE w.tenant_id = :tenant GROUP BY w.name, w.seats_purchased"}

=============== FILE: reports/sql-diff-review.md ===============
# Review of the 41 failing cases, 2026-09-08

Method: both queries run against the 2026-09-01 production snapshot restore -
every tenant, full row counts - with the same `:tenant` bound where the query
takes one, result sets compared row for row after sorting.

## Why the 41 fail the current gate

| Difference from the reference query               | Cases |
|---------------------------------------------------|-------|
| Table alias introduced or renamed                  | 13    |
| Join order or join side swapped                    |  9    |
| CTE instead of a subquery                          |  7    |
| BETWEEN instead of two comparisons                 |  4    |
| GROUP BY or ORDER BY given as an ordinal, or as an expression where the reference gave an ordinal | 3 |
| Reads a different object over the same data        |  3    |
| Column named in a predicate differs                |  1    |
| Predicate in the reference absent from the generated query | 1 |

## What came back, for the cases attached here

q-46 is one of the 9 that already pass and is listed for completeness.

| Case | Reference returned | Generated returned |
|------|--------------------|--------------------|
| q-04 | 38 rows            | 38 rows            |
| q-11 | 9 rows             | 9 rows             |
| q-19 | 96                 | 96                 |
| q-23 | 12 rows            | 12 rows            |
| q-27 | 96                 | 1,204              |
| q-33 | 388                | 412                |
| q-38 | 9 rows             | 9 rows             |
| q-40 | 5 rows             | 5 rows, and the fifth row is not the same plan on every run - three plans tie at 4,800.00 |
| q-44 | 517                | 517                |
| q-46 | 26 rows            | 26 rows            |

Notes on the three that read a different object: `analytics.orders_v` is
defined as `SELECT * FROM analytics.orders`. `analytics_pii.customers_v` and
`analytics.customers_masked_v` carry the same rows; the PII view additionally
exposes email and date of birth columns, which the query does not select.

## The similarity experiment, branch `spike/sql-similarity`

Someone scored generated against reference by text similarity, threshold 0.9.

| Case | Similarity | Reference vs generated result | Verdict at 0.9 |
|------|------------|-------------------------------|----------------|
| q-33 | 0.99       | 388 against 412               | passes         |
| q-27 | 0.93       | 96 against 1,204              | passes         |
| q-11 | 0.62       | same                          | fails          |
| q-23 | 0.71       | same                          | fails          |
| q-04 | 0.88       | same                          | fails          |

Lowercasing and whitespace-stripping was tried first. It recovered 0 of the 41:
none of the 41 differ only in case or spacing.

=============== FILE: branches/execdiff/README.md ===============
# Branch `spike/execdiff` - Y. Bensalem, 2026-09-11

Stop comparing query text. Run both queries, sort both result sets, diff them.
If they match, the model wrote the same query the data team wrote, whatever it
looks like. If they do not, it did not.

Runs against `fixtures/dev-snapshot`, which is already in CI, so this costs a
few seconds a PR and never touches production.

## Run output

```
$ python -m eval.execdiff --cases data/sql_cases.jsonl
2026-09-11 09:02  run 1  48/50 pass   fail: q-33, q-40
2026-09-11 15:47  run 2  49/50 pass   fail: q-33
2026-09-12 08:20  run 3  48/50 pass   fail: q-33, q-40
```

9 of 50 to 48 of 50, and the one that fails every time is a real bug - it
filters on the wrong date column. That is the gate doing its job.

q-40 comes and goes between runs and I have not chased it down yet; I would
merge this and look at that separately rather than hold the whole thing up.

=============== FILE: fixtures/dev-snapshot/manifest.json ===============
{
  "name": "dev-snapshot",
  "built": "2026-09-05",
  "purpose": "CI fixture for warehouse-facing tests",
  "rows_per_table_cap": 500,
  "tenants_present": ["tnt_0007"],
  "schema_notes": [
    "analytics_pii is created here as plain views over the matching analytics tables so developer queries do not error; the column masking in production is not reproduced",
    "analytics.orders_v and analytics.customers_masked_v are created with their production definitions",
    "row counts are capped per table and are not proportional to production"
  ]
}

=============== FILE: docs/query-house-rules.md ===============
# House rules for generated queries

Agreed with the data team and our auditors, 2026-06-02. Nothing checks these
today.

1. **Every generated query is tenant-scoped.** A query that touches a table
   carrying `tenant_id` must constrain it. A query that returns cross-tenant
   rows is a data incident whether or not the numbers are right.
2. **Nothing reads the `analytics_pii` schema.** The masked views in
   `analytics` carry the same rows. The PII schema exists for two batch jobs
   and is not for interactive querying, by anyone or anything.

=============== FILE: requirements.txt ===============
ragas==0.2.14
datasets==3.0.1
