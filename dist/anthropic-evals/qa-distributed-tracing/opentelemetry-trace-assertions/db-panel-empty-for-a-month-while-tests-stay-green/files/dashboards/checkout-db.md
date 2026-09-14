# Panel: database work per checkout (board `chk-db`)

Query, unchanged since the board was built in February:

```
spans
  | where name == "db.query"
  | join kind=inner (spans | where name == "order.create") on trace_id
  | summarize p95(duration_ms), count() by db.sql.table
```

Status: returns no rows since 2026-08-12. Nothing else on the board changed on
that date, and the board's other panels (charge latency, order rate) are fine.

Platform also switched the traces backend to tail sampling on 2026-08-12 under
OBS-1780. That is the date everyone points at first.

Owner note from @lmarsh, 2026-09-05: "There is no shortage of db.query spans -
I can pull millions of them for any hour you like. They just never come back in
the same search as the checkout they belong to. I have stopped using the board."

The same join, with the span names swapped, backs `chk-cache`, `chk-search` and
`fulfil-db`. All three are fine.
