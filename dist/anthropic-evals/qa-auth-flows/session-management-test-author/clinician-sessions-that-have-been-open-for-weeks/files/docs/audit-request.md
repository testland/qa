# SOC 2 Type II — evidence request 14 (control CC6.1), due Friday

Marlow & Chase, 8 September:

> Provide evidence that authenticated sessions to the clinical record
> application expire. We require, for each of the two conditions below, the
> configured control and an automated test demonstrating it, executed within
> the last 30 days.
>
> 14a. A session ends after a defined period without user activity.
>
> 14b. A session cannot remain valid indefinitely.

## Session-store dump, Saturday 6 September, 06:00

Top accounts by request volume. "Session age" is measured from the row's
creation timestamp to the moment of the dump.

| Account     | Session age | Requests in the preceding hour |
|-------------|-------------|--------------------------------|
| dr.okafor   | 41 d 6 h    | 212                            |
| n.bramhall  | 28 d 19 h   | 341                            |
| dr.ellery   | 24 d 2 h    | 90                             |
| dr.vasquez  | 19 d 4 h    | 118                            |
| a.szabo     | 17 d 11 h   | 64                             |

Median session age across the top 20 rows: **6 d 11 h**. Oldest row in the
whole dump: 41 d 6 h. Total rows: 1,842.

## Note from the platform on-call

The 41-day row is genuine, not a clock problem — we checked the creation
timestamp against the deployment log for that build. Sites 2 and 4 run a
kiosk shell that refreshes the open record every few minutes so the screen
does not lock on the bay; nobody has ever asked us to turn that off.
