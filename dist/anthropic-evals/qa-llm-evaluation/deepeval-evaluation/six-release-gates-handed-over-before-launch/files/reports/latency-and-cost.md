# Assistant, staging, rolling 7 days (observability stack, 2026-09-13)

Response time, end to end, from the gateway span:

| Percentile | ms   |
|------------|------|
| p50        | 610  |
| p90        | 1120 |
| p95        | 1430 |
| p99        | 3380 |

Dashboard: `assistant / latency`. Alert rule `assistant-p95-latency` exists and is
currently muted for staging.

Spend, from the provider billing export joined to conversation ids:

| Metric                      | Value     |
|-----------------------------|-----------|
| Conversations, 7 days       | 41,908    |
| Total spend, 7 days         | $1,299.15 |
| Mean spend per conversation | $0.031    |
| p95 spend per conversation  | $0.074    |

No budget alert configured.
