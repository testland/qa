# Capacity sign-off - orders submit path (2026-03-18)

Agreed by platform, orders and SRE. Superseded only by a new sign-off.

| Budget                        | Value                                  |
|-------------------------------|----------------------------------------|
| Submit latency, 95th          | 600 ms or less                         |
| Submit latency, 99th          | 1500 ms or less                        |
| Error rate                    | under 0.5%                             |
| Load to be held               | 300 concurrent users, 10 minutes       |

The promo windows are the reason for the 300 figure; outside them we sit around
60-90 concurrent users.
