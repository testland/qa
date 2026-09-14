# Handover note for 09:00 standup - three threads from overnight

## Problem Description

I came on shift at 06:00 to three open threads in #ops-incidents and a standup at
09:00. Our director chairs it, she reads the channel herself, and she will want
to hear what we think each of these is and who is doing what about it before
lunch. Anything I leave open at 09:00 I will be asked about again at 13:00, so I
would rather hand over a short, firm line on each than a paragraph.

The channel dump is attached with everything anyone pasted into it overnight: a
CPU profile somebody captured off one of the app hosts, and a confirmation run
the 02:00 on-call did along with the script they ran. I have not been through
any of it properly - I have been on the phone to the acquirer since 06:20.

What I need from you is the note itself. Three sections, one per thread, in
thread order. For each: what the attached material actually establishes, the
single next action I should name in the standup, and the cause.

Stack is Python 3.12 / Django / gunicorn sync workers, Postgres 16, six app
hosts behind the edge. Nobody has deployed since the 9th.

## Output Specification

1. Write `docs/handover-2026-09-13.md` with one section per thread, in thread
   order: INC-2291, INC-2294, INC-2288.
2. Each section states what is established, the cause, and exactly one next
   action - the single thing I would have somebody start before the 13:00
   check-in, not a list of workstreams.
3. Do not edit the attached files.

## Input Files

Extract the following files before beginning.

=============== FILE: incidents/channel-dump.md ===============
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

=============== FILE: profiles/orders-v2-folded.txt ===============
# py-spy record --native --format raw, app-3, 30s under live traffic, 2026-09-12 14:23
# 12,880 samples total. OrdersView.get appears in 12,466 of them (96.8%, inclusive).
gunicorn;sync_worker;OrdersView.get;qs.__iter__;psycopg2.cursor.execute;pg_send_query_blocking 7284
gunicorn;sync_worker;OrdersView.get;qs.__iter__;psycopg2.cursor.execute;pq_read_data 2802
gunicorn;sync_worker;OrdersView.get;qs.__iter__;psycopg2.cursor.fetchall 1204
gunicorn;sync_worker;OrdersView.get;OrderSerializer.to_representation;json.dumps 431
gunicorn;sync_worker;OrdersView.get;OrderSerializer.to_representation;decimal.Decimal.__str__ 388
gunicorn;sync_worker;middleware.auth;jwt.decode 214
gunicorn;sync_worker;OrdersView.get;OrderSerializer.to_representation;format_money 173
gunicorn;sync_worker;HealthView.get 139
gunicorn;sync_worker;OrdersView.get;paginate;len 96
gunicorn;sync_worker;OrdersView.get;build_filters;re.compile 88
gunicorn;sync_worker;middleware.request_log;time.strftime 61

=============== FILE: load/confirm-checkout.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  iterations: 50,
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const body = JSON.stringify({ sku: 'SKU-4471', qty: 1, card: 'tok_test_visa' });

export default function () {
  const res = http.post(`${__ENV.BASE_URL}/api/checkout`, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${__ENV.API_TOKEN}`,
    },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

=============== FILE: reports/checkout-confirm-summary.json ===============
{
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "thresholds": { "p(95)<500": { "ok": true } },
      "values": {
        "avg": 96.44,
        "min": 38.12,
        "med": 74.18,
        "max": 908.31,
        "p(90)": 168.22,
        "p(95)": 212.77
      }
    },
    "http_req_failed": {
      "type": "rate",
      "thresholds": { "rate<0.01": { "ok": true } },
      "values": { "rate": 0 }
    },
    "checks": {
      "type": "rate",
      "values": { "rate": 1, "passes": 50, "fails": 0 }
    },
    "http_reqs": {
      "type": "counter",
      "values": { "count": 50, "rate": 15.15 }
    },
    "iterations": {
      "type": "counter",
      "values": { "count": 50, "rate": 15.15 }
    },
    "vus": { "type": "gauge", "values": { "value": 20, "min": 20, "max": 20 } },
    "vus_max": { "type": "gauge", "values": { "value": 20, "min": 20, "max": 20 } }
  }
}
