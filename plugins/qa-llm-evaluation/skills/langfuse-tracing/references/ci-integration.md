# Langfuse CI integration

Langfuse is observability-side, not pre-deploy CI-side. Typical
post-deploy CI patterns use the Langfuse API to query recent traces and
assert on aggregate metrics.

## Score-query gate

```python
import httpx, os, sys
from datetime import datetime, timedelta, timezone

LANGFUSE_HOST = os.environ["LANGFUSE_HOST"]
headers = {"Authorization": f"Bearer {os.environ['LANGFUSE_SECRET_KEY']}"}

# Fetch average answer_relevance score over the last hour
one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
resp = httpx.get(
    f"{LANGFUSE_HOST}/api/public/scores",
    params={"name": "answer_relevance", "fromTimestamp": one_hour_ago},
    headers=headers,
)
scores = resp.json()["data"]
avg = sum(s["value"] for s in scores) / len(scores) if scores else 1.0

if avg < 0.75:
    print(f"answer_relevance regression: {avg:.2f} < 0.75 threshold")
    sys.exit(1)
```

**Validation:** After the CI job runs, confirm the script exits 0 and
that the queried score window covers the expected deployment window. If
`scores` is empty, verify the `fromTimestamp` range and that
instrumented calls have been scored in that period.

## Other CI wiring patterns

- **Eval-on-trace**: post-deploy, run an offline eval sweep against
  production traces from the previous N hours; fail if regression.
- **Cost regression**: alert on per-trace cost increase that exceeds
  budget.
- **Score-based alerting**: route to PagerDuty / Slack / Datadog on
  drop in average score over a rolling window.
