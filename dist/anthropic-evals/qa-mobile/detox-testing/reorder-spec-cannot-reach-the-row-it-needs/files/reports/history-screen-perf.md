# Order history screen, time to interactive

Pixel 6a, release build, cold navigation from the home tab, median of 20 runs.
Test account has 40 orders.

| Build                                   | TTI   | Frames dropped on first scroll |
|-----------------------------------------|-------|--------------------------------|
| main @ 2.4.0                            | 240ms | 0                              |
| main + PR #901                          | 1.9s  | 11                             |

Order history is the second most visited screen in the app (18.4% of sessions).
Our internal budget for a list screen is 400ms TTI and zero dropped frames on
the first scroll. PR #901 misses both by a wide margin.

Nadia: "Blocking, and I am holding production changes on that screen until the
sprint closes. We are not making the screen four times slower for every
customer so that one spec can find a row."
