# Sessions, 28-day window ending 2026-09-08

| Device class            | Share | Notes |
|-------------------------|-------|-------|
| Android phone           | 44%   | Median device is a mid-range Android, 4 GB RAM, 2-year-old SoC. |
| iPhone                  | 27%   | |
| Desktop / laptop        | 26%   | |
| Tablet                  | 3%    | |

Connection class, phone sessions only: 52% 4G, 31% wifi, 14% 3G-class, 3% 5G.

All 61 "Add to shelf" tickets since January are Android phone sessions. None are
desktop. The button dispatches a handler that re-sorts the full shelf list in
the main thread before it persists anything; the shelf list is 400+ items for
our heaviest users.
