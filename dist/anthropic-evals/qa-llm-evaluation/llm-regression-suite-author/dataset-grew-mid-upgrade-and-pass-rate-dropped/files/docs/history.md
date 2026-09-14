# Eval suite — what has been done to it

| Date       | Who   | What                                                                       |
|------------|-------|----------------------------------------------------------------------------|
| 2026-06-01 | ops   | Policy rev published. 30-day window across all markets.                     |
| 2026-07-20 | marco | Suite created. Six rows in `datasets/golden.csv`.                           |
| 2026-07-24 | marco | `shipping-cost` amended to also check the wording about cost. Red ever since. |
| 2026-08-11 | marco | Baseline captured against `gpt-4.1-2025-04-14` and committed.               |
| 2026-09-02 | priya | Two rows appended to `datasets/golden.csv`. Same file, same path, no version change. Expected values written by hand from the ticket thread; never run against any model. |
| 2026-09-10 | marco | Candidate run against `gpt-5.4-mini-2026-04-02`. Gate goes red.             |

Priya's commit message: "add the two EU cases from #4412, we keep getting this
one wrong". She is on leave until 2026-09-21.

Marco's note against `shipping-cost`, 2026-07-24: "both halves of that sentence
matter so I put both checks in the row, will work out why it is still red when
I get a minute".
