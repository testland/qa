# Variance study - Ravi, 2026-09-08

Build pinned to 2026.9.4, `seed=fixed`, no code or data changes between runs.
Each region captured 40 times; differing-pixel count recorded per run against
the first capture of the series.

| Region                | Selector                       | Page      | Region size | Diff px min | Diff px max |
|-----------------------|--------------------------------|-----------|-------------|-------------|-------------|
| Plan comparison table | [data-region="plan-cards"]     | /pricing  | 1280 x 900  | 0           | 0           |
| Signup counter strip  | #social-proof-ticker           | /pricing  | 1280 x 64   | 940         | 1410        |
| Partner ad slot       | iframe[title="sponsored"]      | /pricing  | 728 x 90    | 0           | 41800       |
| Review widget         | .trustpilot-widget             | /pricing  | 320 x 180   | 0           | 3120        |
| Launch countdown      | #launch-countdown              | /pricing  | 240 x 48    | 0           | 0           |
| Site header           | header.site                    | /pricing  | 1280 x 72   | 0           | 0           |
| Usage chart           | [data-testid="usage-chart"]    | /app/...  | 640 x 360   | 2400        | 3900        |

Notes:

- The counter strip reads "2,384 teams signed up this week" and increments
  through the day. The ad slot rotates creative on every load. The review widget
  renders a live review count and a star row.
- The countdown reads a launch date that `seed=fixed` pins, which is why it does
  not move here even though the name suggests it would.
- The usage chart is drawn with curved anti-aliased lines over a dense 90-day
  series. It never produced zero and never exceeded 3900 across the 40 runs.
  This began when we switched that chart to curves in June; it did not do it
  before.
