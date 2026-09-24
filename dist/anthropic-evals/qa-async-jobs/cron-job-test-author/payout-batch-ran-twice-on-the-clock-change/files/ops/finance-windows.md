# Windows the finance jobs have to fit inside

All times below are wall-clock America/New_York, because that is what the
controllers and the external reconciliation window work to.

- The settlement batch must be posted before 02:00, when the reconciliation
  window with the banking partner opens. A batch that arrives after 02:00 is
  carried into the next day's window and shows up as a late posting on the
  partner's statement; we have had two.
- The books must be frozen after the settlement batch is posted and before
  06:00, when the daily report build reads the frozen copy. A report build that
  runs against books that were never frozen produces numbers that do not tie out,
  and nothing in the build notices.
- The accounting day these jobs close is the previous calendar day in
  America/New_York.
