# Tracker availability, July - August

From the vendor status page, retrieved 2026-09-10.

| window | endpoint | duration |
|---|---|---|
| 2026-07-20 14:05 | issue create + search | 9 minutes, timeouts |
| 2026-07-28 06:40 | search only, 403 rate-limit responses | 4 hours 20 minutes |
| 2026-08-05 11:10 | search only, 403 rate-limit responses | 70 minutes |
| 2026-08-22 23:15 | search only, degraded latency | 35 minutes |

Our checkout suite runs on a five-minute schedule across six shards. Every
shard that fails calls the filer once.
