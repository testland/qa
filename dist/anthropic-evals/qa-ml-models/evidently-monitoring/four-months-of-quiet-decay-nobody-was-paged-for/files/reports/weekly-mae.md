# delivery-eta weekly quality, weeks 20-38 (2026)

Compiled by hand by DS on Mondays from the warehouse. `actual_minutes` is
complete for every one of these weeks.

| Week | MAE (min) | Max nightly share of drifted columns | Pages | Model  |
|------|-----------|--------------------------------------|-------|--------|
| 20   | 4.1       | 0.000                                | 0     | eta-v6 |
| 22   | 4.4       | 0.000                                | 0     | eta-v6 |
| 24   | 4.9       | 0.000                                | 0     | eta-v6 |
| 26   | 5.4       | 0.000                                | 0     | eta-v6 |
| 28   | 6.0       | 0.000                                | 0     | eta-v6 |
| 30   | 6.7       | 0.000                                | 0     | eta-v6 |
| 32   | 7.4       | 0.000                                | 0     | eta-v6 |
| 34   | 8.2       | 0.000                                | 0     | eta-v6 |
| 36   | 9.0       | 0.000                                | 0     | eta-v6 |
| 38   | 9.8       | 0.000                                | 0     | eta-v6 |

No retrain in this window. eta-v6 has been serving since week 14.

Warehouse means over the same window, straight from the day table:

| Column                   | Week 20 | Week 38 | Total change | Per week |
|--------------------------|---------|---------|--------------|----------|
| avg_courier_speed_kmh    | 21.4    | 18.2    | -15.0%       | -0.82%   |
| orders_in_flight_at_pick | 3.1     | 4.6     | +48.4%       | +2.1%    |
| distance_km              | 3.8     | 4.1     | +7.9%        | +0.42%   |
| pick_pack_minutes        | 6.2     | 8.0     | +29.0%       | +1.4%    |
| store_queue_depth        | 2.4     | 3.9     | +62.5%       | +2.6%    |
| predicted_minutes        | 24.6    | 25.1    | +2.0%        | +0.11%   |
| actual_minutes           | 25.9    | 32.4    | +25.1%       | +1.2%    |
