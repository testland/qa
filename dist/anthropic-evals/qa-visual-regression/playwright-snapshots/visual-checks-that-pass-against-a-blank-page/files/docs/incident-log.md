# Web incidents, 2026 Q3 (extract)

| Date       | Ref     | Summary                                                                 |
|------------|---------|-------------------------------------------------------------------------|
| 2026-07-06 | INC-118 | Routing change shipped 07-06 09:10 sent unauthenticated traffic on /marketing to a 404 shell. Reverted 07-13 16:40. Seven days. Nobody noticed internally; a partner reported it. |
| 2026-07-22 | INC-121 | Search autocomplete returned 500s for two hours during a reindex.        |
| 2026-08-11 | INC-127 | Checkout tax line rounded down by a cent for EU carts, four days.        |

CI note attached to INC-118 by @priya on 2026-07-14: "Checked whether anything
in the pipeline should have caught this. The visual job ran 31 times across
those seven days and was green on all 31."
