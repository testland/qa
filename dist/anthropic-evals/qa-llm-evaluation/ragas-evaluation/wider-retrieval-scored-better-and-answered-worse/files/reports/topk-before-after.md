# Retrieval width change, 2026-08-03. Same 60 golden rows, run before and after.

## What the dashboard showed

| Metric         | k=4  | k=20 | Gate  |
|----------------|------|------|-------|
| context_recall | 0.71 | 0.94 | >=0.85 |
| faithfulness   | 0.93 | 0.91 | >=0.90 |

Verdict printed on the day: PASS, and recall up 23 points. Change approved.

## Per-route breakdown (not on the dashboard)

30 handbook rows, 30 contract rows.

| Route     | Metric         | k=4  | k=20 |
|-----------|----------------|------|------|
| handbook  | context_recall | 0.86 | 0.93 |
| handbook  | faithfulness   | 0.94 | 0.86 |
| contracts | context_recall | 0.56 | 0.95 |
| contracts | faithfulness   | 0.92 | 0.96 |

## Retrieval numbers we compute on every run and have never gated on

These land on the second tab of the dashboard. Nobody has ever put a floor
under them.

| Route     | Metric            | k=4  | k=20 |
|-----------|-------------------|------|------|
| handbook  | context_precision | 0.97 | 0.95 |
| contracts | context_precision | 0.61 | 0.24 |

## Where the passage the answer needed was sitting in the ranking

Measured on the k=20 run: position of the passage containing the reference
answer, over the 30 rows of each route.

| Route     | Mean rank | Median rank | Worst rank |
|-----------|-----------|-------------|------------|
| handbook  | 1.4       | 1           | 3          |
| contracts | 7.4       | 6           | 16         |

## Hand-count, done 2026-09-05

Two people read the same 30 handbook answers from each run and counted answers
that stated a policy belonging to a department other than the one asked about.

| Route     | Observation                                        | k=4   | k=20  |
|-----------|----------------------------------------------------|-------|-------|
| handbook  | answers mixing in another department's policy       | 1/30  | 11/30 |
| contracts | "not in the document set" complaints, per fortnight | 14    | 2     |

Two of the eleven, written out:

- **hb-03**, "What is the on-call allowance for engineering?" Answer: "On-call
  is paid at 120 per weekend rotation; field services standby is paid at 95 per
  night." Passages 1 and 2 of the 20 were the engineering rotation policy;
  passage 9 was the field-services standby schedule. Every figure in the answer
  appears in one of the twenty passages.
- **hb-19**, "Can I carry annual leave into next year?" Answer: "Up to 5 days
  carry over and expire on 31 March; contractors accrue no carry-over."
  Passage 1 was the carry-over policy; passage 14 was the contractor terms
  appendix. Both statements appear in the passages.
