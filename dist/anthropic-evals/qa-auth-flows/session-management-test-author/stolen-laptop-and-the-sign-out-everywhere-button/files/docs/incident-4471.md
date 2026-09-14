# Incident 4471 — laptop taken, Bristol depot

## Timeline

| When | What |
|---|---|
| 4 Sep 08:12 | `r.adeyemi` opens the desktop launcher on `laptop-7` and is signed in through it. Session row `9f2c...` created. |
| 6 Sep 18:40 | Laptop taken from a parked car. Machine was awake and signed in; OS account has no password on wake. |
| 6 Sep 19:05 | She signs in to the phone app on `pixel-r` with her password, Account → Security, presses **Sign out everywhere**. UI confirms "You have been signed out on all devices." |
| 6 Sep 19:06 | She changes her password. |
| 6 Sep 19:07 | Her phone session continues to work; she keeps taking on-call. |
| 8 Sep 14:40 | Access log: `GET /tickets/queue` plus four ticket views on session `9f2c...` from 81.2.x.x (Bristol, not the depot, not her home). |
| 8 Sep 15:20 | Row `9f2c...` deleted by hand by platform on-call. |

Row `9f2c...` was never deleted by the application between 4 Sep 08:12 and
8 Sep 15:20. The password change did not touch it. The four ticket views on
8 Sep returned 200 and are recorded in the application's own request log, not
in the CDN log.

## Kieran (platform), 9 Sep

> Two things.
>
> One: I do not think the account-security path is where the problem is. I
> signed in to my own account in two browsers, pressed Sign out everywhere in
> one, and the other was dead on the next click. There is a test for that case
> in the suite and it is green. My reading is that the laptop was showing a
> cached page and the queue widget was retrying out of the browser cache.
>
> Two: the fix is to cap every account to one live session — a new sign-in
> kills whatever was there before. That closes this class of incident
> permanently, it is about twenty lines, and every bank app in the world does
> it.

## Usage, last 30 days (same store dump)

| | |
|---|---|
| Agents holding 2+ live sessions at some point in a shift | 78% |
| Median live sessions per agent | 2 |
| Sessions created through the desktop launcher | 71% |
| Sessions created with a password | 29% |
| Devices the on-call pager delivers to | the phone app session only |
