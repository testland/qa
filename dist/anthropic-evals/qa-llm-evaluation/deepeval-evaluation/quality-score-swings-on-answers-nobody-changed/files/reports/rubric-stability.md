# Five consecutive runs of the identical suite, 2026-09-08

Same twelve cases, same checked-in strings, no application code executed between
runs. Only the judge ran. Judge model and temperature were the same on all five.

## Quality (bar 0.60)

| Case | run 1 | run 2 | run 3 | run 4 | run 5 | verdict spread  |
|------|-------|-------|-------|-------|-------|-----------------|
| q-01 | 0.74  | 0.52  | 0.88  | 0.61  | 0.43  | 3 pass / 2 fail |
| q-02 | 0.69  | 0.71  | 0.44  | 0.83  | 0.55  | 3 pass / 2 fail |
| q-03 | 0.58  | 0.90  | 0.47  | 0.66  | 0.79  | 3 pass / 2 fail |
| q-04 | 0.81  | 0.46  | 0.72  | 0.51  | 0.68  | 3 pass / 2 fail |
| q-05 | 0.72  | 0.64  | 0.85  | 0.59  | 0.77  | 4 pass / 1 fail |
| q-06 | 0.81  | 0.70  | 0.63  | 0.88  | 0.74  | 5 pass / 0 fail |
| q-07 | 0.66  | 0.79  | 0.52  | 0.71  | 0.60  | 4 pass / 1 fail |
| q-08 | 0.66  | 0.79  | 0.52  | 0.71  | 0.60  | 4 pass / 1 fail |
| q-09 | 0.57  | 0.83  | 0.69  | 0.48  | 0.75  | 3 pass / 2 fail |
| q-10 | 0.88  | 0.61  | 0.53  | 0.79  | 0.67  | 4 pass / 1 fail |
| q-11 | 0.73  | 0.49  | 0.81  | 0.64  | 0.58  | 3 pass / 2 fail |
| q-12 | 0.62  | 0.86  | 0.51  | 0.70  | 0.77  | 4 pass / 1 fail |

Observed range across every case and run: 0.43 to 0.90. Gate outcome: red on
runs 1, 2, 3, 4 and 5 — a different set of cases each time.

## Refund window accuracy (bar 0.90)

| Case | run 1 | run 2 | run 3 | run 4 | run 5 |
|------|-------|-------|-------|-------|-------|
| q-01 | 1.00  | 1.00  | 1.00  | 1.00  | 1.00  |
| q-02 | 1.00  | 1.00  | 0.98  | 1.00  | 1.00  |
| q-03 | 0.96  | 1.00  | 0.97  | 0.99  | 0.98  |
