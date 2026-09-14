# Review of the 41 failing cases, 2026-09-08

Method: both queries run against the 2026-09-01 production snapshot restore -
every tenant, full row counts - with the same `:tenant` bound where the query
takes one, result sets compared row for row after sorting.

## Why the 41 fail the current gate

| Difference from the reference query               | Cases |
|---------------------------------------------------|-------|
| Table alias introduced or renamed                  | 12    |
| Join order or join side swapped                    |  9    |
| CTE instead of a subquery                          |  7    |
| BETWEEN instead of two comparisons                 |  4    |
| GROUP BY or ORDER BY given as an ordinal, or as an expression where the reference gave an ordinal | 3 |
| Reads a different object over the same data        |  3    |
| Column named in a predicate differs                |  1    |
| Predicate in the reference absent from the generated query | 1 |
| Predicate in the reference replaced by a join      |  1    |

## What came back, for the cases attached here

q-46 is one of the 9 that already pass and is listed for completeness.

| Case | Reference returned | Generated returned |
|------|--------------------|--------------------|
| q-04 | 38 rows            | 38 rows            |
| q-11 | 9 rows             | 9 rows             |
| q-19 | 96                 | 96                 |
| q-23 | 12 rows            | 12 rows            |
| q-27 | 96                 | 1,204              |
| q-31 | 214                | 3,902              |
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
| q-31 | 0.91       | 214 against 3,902             | passes         |
| q-27 | 0.93       | 96 against 1,204              | passes         |
| q-11 | 0.62       | same                          | fails          |
| q-23 | 0.71       | same                          | fails          |
| q-04 | 0.88       | same                          | fails          |

Lowercasing and whitespace-stripping was tried first. It recovered 0 of the 41:
none of the 41 differ only in case or spacing.
