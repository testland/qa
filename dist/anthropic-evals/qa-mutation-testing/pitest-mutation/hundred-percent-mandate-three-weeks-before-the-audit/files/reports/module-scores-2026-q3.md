# acme-core — mutation scores, last three scheduled runs per module

| module        | gate today | run 2026-07-05 | run 2026-08-02 | run 2026-09-06 | mutations |
|---------------|------------|----------------|----------------|----------------|-----------|
| pricing       | 60         | 81             | 82             | 81             | 2,940     |
| checkout      | 75         | 77             | 76             | 78             | 5,118     |
| legacy-import | none (0)   | 36             | 36             | 37             | 4,110     |
| notify-api    | 65         | 68             | 69             | 68             | 3,377     |

`legacy-import` inherits the parent default, so it is effectively ungated: the
build has never failed on it. It is 62k lines of statement-import code written
between 2011 and 2016, in maintenance only, roughly 40 lines changed per
quarter.

Scheduled full runs take: pricing 41m, checkout 1h18m, legacy-import 1h04m,
notify-api 52m.

From the platform changelog:

| date    | ticket    | change                                                    |
|---------|-----------|-----------------------------------------------------------|
| 2024-03 | PLAT-1904 | Gates introduced. pricing 60, checkout 75, notify-api 65.  |
| 2024-11 | PLAT-2210 | Operator set widened to the complete catalogue.            |
| 2025-06 | PLAT-2788 | checkout gate 70 -> 75 after two quarters above it.        |

Scores recorded immediately before PLAT-2210 landed: pricing 88, checkout 86,
legacy-import 55, notify-api 79. Run times immediately before PLAT-2210:
pricing 14m, checkout 31m, legacy-import 26m, notify-api 19m.
