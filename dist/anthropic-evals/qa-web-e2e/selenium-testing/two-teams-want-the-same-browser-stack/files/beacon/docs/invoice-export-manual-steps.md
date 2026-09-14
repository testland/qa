# Invoice export — manual release script

Run by whoever draws the short straw, every release. Takes about 12 minutes.
Three production incidents in 2026 (Feb, May, August) all started here.

1. Sign in as an operations user.
2. Go to Billing → Invoices.
3. Set the period filter to "Last quarter". The table reloads; the row count in
   `[data-testid=invoice-count]` settles on a number.
4. Tick the "Include credit notes" box (`[data-testid=include-credit-notes]`).
   The count goes up.
5. Press Export (`[data-testid=export-invoices]`). The button is disabled until
   at least one row is selected and the count has settled.
6. A status strip appears (`[data-testid=export-status]`) and reads "Preparing
   export". It becomes "Ready" when the file is built — usually 4-8 seconds,
   sometimes 30 on a big quarter.
7. Press Download (`[data-testid=export-download]`) — only present once the
   status reads Ready.
8. Confirm the filename shown in `[data-testid=export-filename]` matches
   `invoices-<year>-Q<quarter>.csv`.

If the status strip sticks on "Preparing export" for more than a minute the
export has failed; that is the bug that keeps recurring.
