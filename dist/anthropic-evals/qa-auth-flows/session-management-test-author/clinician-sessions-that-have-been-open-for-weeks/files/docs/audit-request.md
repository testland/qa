# SOC 2 Type II — evidence request 14 (control CC6.1), due Friday

Marlow & Chase, 8 September:

> Provide evidence that authenticated sessions to the clinical record
> application expire. We require both the configured control and an automated
> test demonstrating it, executed within the last 30 days.

## Session-store dump, Saturday 6 September, 06:00

Top accounts by request volume. "Session age" is measured from the row's
creation timestamp to the moment of the dump.

| Account     | Session age | Requests in the preceding hour | Password prompted since creation |
|-------------|-------------|--------------------------------|----------------------------------|
| dr.okafor   | 41 d 6 h    | 212                            | no                               |
| n.bramhall  | 28 d 19 h   | 341                            | no                               |
| dr.ellery   | 24 d 2 h    | 90                             | no                               |
| dr.vasquez  | 19 d 4 h    | 118                            | no                               |
| a.szabo     | 17 d 11 h   | 64                             | no                               |

Median session age across the top 20 rows: **6 d 11 h**. Oldest row in the
whole dump: 41 d 6 h. Total rows: 1,842.

Ward workstations are shared and are signed in on a rolling shift pattern, so
a bay is rarely quiet for half an hour between 07:00 and 21:00.

## Note from the platform on-call

The 41-day row is genuine, not a clock problem — we checked the creation
timestamp against the deployment log for that build. No row in the dump has
ever been re-authenticated; the store has no column for it.
