# Monthly usage report

The query behind the invoice line, unchanged since May:

    SELECT account_id, SUM(billed_usage_cents) AS usage_cents
    FROM meter_billed_usage
    WHERE month = :month
    GROUP BY account_id;

`meter_billed_usage` receives one row per call to the meter's billed-usage entry
point. The report performs no deduplication of its own and never has - it sums
what the meter was told, and nothing else reads or writes that table.
