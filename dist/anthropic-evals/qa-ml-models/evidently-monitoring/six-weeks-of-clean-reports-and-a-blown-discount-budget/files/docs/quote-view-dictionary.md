# analytics.quote_accept_scored — data dictionary (extract)

One row per quote, written at quote time.

| Column                 | Written by          | When                                    |
|------------------------|---------------------|-----------------------------------------|
| quote_id               | quote service       | at quote                                |
| driver_age .. add_ons_count | quote service  | at quote (21 columns)                    |
| score                  | quote-accept model  | at quote                                |
| label                  | policy service      | when the quote resolves                  |

`label` is `accepted`, `expired` or `lapsed`. A quote resolves when the customer
buys, or when the quote expires. Median time to resolution is 14 days; the 95th
percentile is 21 days. Rows carry `label = null` until then, and the column is
backfilled in place.

Reference snapshots live in `analytics.quote_accept_reference`, cut at model
promotion and never edited afterwards.
