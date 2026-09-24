# acme-core — scheduled mutation runs, last three per module

| module        | gate today | 2026-07-05 | 2026-08-02 | 2026-09-06 | mutations (09-06) | killed (09-06) |
|---------------|------------|------------|------------|------------|-------------------|----------------|
| pricing       | 60         | 81         | 82         | 81         | 2,940             | 2,381          |
| checkout      | 75         | 77         | 76         | 78         | 5,118             | 3,992          |
| legacy-import | none (0)   | 36         | 36         | 37         | 12,480            | 4,618          |
| notify-api    | 65         | 68         | 69         | 68         | 3,377             | 2,296          |

`legacy-import` inherits the parent default, so it is effectively ungated: the
build has never failed on it. It is 62k lines of statement-import code written
between 2011 and 2016, in maintenance only, roughly 40 lines changed per
quarter. It is also by some distance the largest thing we mutate.

Scheduled full runs take: pricing 41m, checkout 1h18m, legacy-import 3h06m,
notify-api 52m. All four modules inherit the parent's operator configuration.

From the platform changelog:

| date    | ticket    | change                                                     |
|---------|-----------|------------------------------------------------------------|
| 2024-03 | PLAT-1904 | Gates introduced. pricing 60, checkout 75, notify-api 65.   |
| 2024-11 | PLAT-2210 | Operator set widened to the complete catalogue, all modules.|
| 2025-06 | PLAT-2788 | checkout gate 70 -> 75 after two quarters above it.         |
| 2026-02 | PLAT-3301 | legacy-import added to the scheduled run for the first time.|
