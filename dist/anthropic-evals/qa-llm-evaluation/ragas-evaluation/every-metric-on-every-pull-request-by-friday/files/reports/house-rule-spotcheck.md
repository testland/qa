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
