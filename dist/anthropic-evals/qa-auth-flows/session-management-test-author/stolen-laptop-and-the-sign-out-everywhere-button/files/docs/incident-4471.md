# Incident 4471 — laptop taken, Bristol depot

## Timeline

| When | What |
|---|---|
| 4 Sep 08:12 | `r.adeyemi` signs in on `laptop-7`. Session row `9f2c…` created. |
| 6 Sep 18:40 | Laptop taken from a parked car. Machine was awake and signed in; OS account has no password on wake. |
| 6 Sep 19:05 | She signs in on her phone (`pixel-r`), Account → Security, presses **Sign out everywhere**. UI confirms "You have been signed out on all devices." |
| 6 Sep 19:06 | She changes her password. |
| 6 Sep 19:07 | Her phone session continues to work; she keeps taking on-call. |
| 8 Sep 14:40 | Access log: `GET /tickets/queue` plus four ticket views on session `9f2c…` from 81.2.x.x (Bristol, not the depot, not her home). |
| 8 Sep 15:20 | Row `9f2c…` deleted by hand by platform on-call. |

Row `9f2c…` was never deleted by the application between 4 Sep 08:12 and
8 Sep 15:20. The password change did not touch it.

## Kieran (platform), 9 Sep

> Two things.
>
> One: that session should have stopped working at 19:05 and it did not, so
> something in the account-security path is wrong. I have not had time to look
> at it.
>
> Two: the fix is obvious and I would rather do it than chase the first thing.
> Cap every account to one live session — a new sign-in kills whatever was
> there before. That closes this class of incident permanently, it is about
> twenty lines, and every bank app in the world does it.

## Usage, last 30 days (same store dump)

| | |
|---|---|
| Agents holding 2+ live sessions at some point in a shift | 78% |
| Median live sessions per agent | 2 |
| Devices the on-call pager delivers to | the phone app session only |

Sev-1 #3102 (March) and Sev-1 #3390 (June) were both paged to an engineer
whose phone session had ended without them noticing. Acknowledgement took 41
and 63 minutes respectively; the post-incident actions on both were "make sure
the phone session survives a desktop sign-in".
