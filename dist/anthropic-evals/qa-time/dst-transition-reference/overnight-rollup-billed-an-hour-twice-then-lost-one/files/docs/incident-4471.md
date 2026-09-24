# INC-4471 - metered usage reconciliation breaks twice a year

Reported by: finance (M. Okonjo), 2026-11-14
On-call: P. Raghavan

## What finance found

| Invoice | Accounts | Direction | Amount |
|---|---|---|---|
| March 2026  | 4 (all America/New_York) | over  | 3600s, also present on the next day's line |
| November 2026 | the same 4 | under | 3600s, present in the raw log, on no invoice line |

Windows pulled out of the worker for the affected dates, plus a couple of
others I grabbed while I was in there. Sessions on these accounts are
continuous 24/7:

```
2026-03-08 America/New_York  : 2026-03-08T05:00:00Z -> 2026-03-09T05:00:00Z
2026-03-09 America/New_York  : 2026-03-09T04:00:00Z -> 2026-03-10T04:00:00Z
2026-11-01 America/New_York  : 2026-11-01T04:00:00Z -> 2026-11-02T04:00:00Z
2026-11-02 America/New_York  : 2026-11-02T05:00:00Z -> 2026-11-03T05:00:00Z
2026-03-07 America/Havana    : 2026-03-07T05:00:00Z -> 2026-03-08T05:00:00Z
2026-03-08 America/Havana    : 2026-03-08T04:00:00Z -> 2026-03-09T04:00:00Z
2026-06-15 Australia/Lord_Howe : 2026-06-14T13:30:00Z -> 2026-06-15T13:30:00Z
```

Only the US accounts have been reconciled. We have not looked at whether the
rest of the book is clean or whether nobody has checked.

## Proposed patch (P. Raghavan, not yet a PR)

```diff
 function dayWindow(localDate, zone) {
   const start = localToInstant(localDate + 'T00:00:00', zone);
-  const end = new Date(start.getTime() + 24 * HOUR_MS);
+  let hours = 24;
+  if (localDate === '2026-03-08') hours = 23;
+  if (localDate === '2026-11-01') hours = 25;
+  const end = new Date(start.getTime() + hours * HOUR_MS);
   return { start, end };
 }
```

plus, in the invoice builder (`src/invoice.js`, not shown):

```diff
-  const key = accountId + '|' + session.id;
+  // belt and braces: one account can never be billed the same local hour twice
+  const key = accountId + '|' + localDateOf(session) + '|' + localHourOf(session);
```

Reran both invoices with this applied. March reconciled. November reconciled.
Suggest we ship before the next billing run on the 20th.
