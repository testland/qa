# #ops-incidents - overnight 2026-09-12 into 2026-09-13

## Thread INC-2291 - "everything feels slow" (opened 22:41, still open)

**22:41 @dmoreau** getting reports from two of the CS team that the app "feels
sluggish". Nothing specific. Dashboards look normal-ish to me.

**22:48 @dmoreau** app-7 CPU looked high when I glanced at it, 70-80%? The others
are at 30. Might be nothing, it is the one with the oldest uptime.

**23:02 @rkelleher** which page? which endpoint?

**23:04 @dmoreau** they did not say. "the whole thing". I have asked and had no
reply, they are off shift now.

**23:19 @rkelleher** I bet it is this. We ship this on every list page and it is
compiled per call:

```python
# utils/formatting.py
def humanise_ref(ref: str) -> str:
    return re.sub(r"^(([A-Z]{2,4})[-_ ]?)+(\d{4,12})$", r"\2-\3", ref.strip())
```

**23:21 @rkelleher** catastrophic backtracking waiting to happen. I can have a
fix up in ten minutes if someone wants to approve it, it is a one-line change to
precompile it and anchor the group.

**23:40 @dmoreau** leaving it open for the night shift. No profile captured, no
endpoint, app-7 not restarted.

## Thread INC-2294 - orders list latency (opened 14:10, still open)

**14:10 @svirtanen** `GET /api/v2/customers/{id}/orders` p95 has gone from 180 ms
to 2.9 s. Started 14:06, no deploy since the 9th. Error rate unchanged at 0.1%.

**14:22 @svirtanen** captured a 30-second profile off app-3 with py-spy while it
was bad - `profiles/orders-v2-folded.txt`.

**14:38 @tobrien** `OrdersView.get` is in 96.8% of the samples, so it is
definitely that view. `json.dumps` and the Decimal formatting are all over the
profile too - I have wanted to move us to a faster serializer for a year, this
looks like the excuse.

**14:41 @tobrien** also worth bumping gunicorn workers from 4 to 12 on all six
hosts while we are in there, we have the headroom.

**15:02 @svirtanen** note: we added an index on `orders(created_at)` in July for
the reporting page. Nothing else on that table except the primary key. Table is
around 8.4M rows now. Nobody has captured a plan for anything.

**16:30 @svirtanen** handing over, nothing changed yet.

## Thread INC-2288 - checkout "spinning" (opened 03:12, still open)

**03:12 @pnair** two tickets overnight saying checkout spins. Reproduced once
myself at 03:09, then not again.

**03:31 @pnair** ran our confirmation script against `/api/checkout` for a minute
at 20 users - script is `load/confirm-checkout.js`, output in
`reports/checkout-confirm-summary.json`. Thresholds are the ones we use
everywhere, p95 under 500 ms and failures under 1%. All green, exit code 0.

**03:34 @pnair** going back to bed, leaving it open so day shift sees it.
