# AWS Lambda timeout + billing budgets

AWS Lambda's wall-clock limit is **15 minutes (900 seconds)** per
invocation. Per
[docs.aws.amazon.com/lambda configuration-timeout](https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html):
"The default value for this setting is 3 seconds, but you can adjust this in
increments of 1 second up to a maximum value of 900 seconds (15 minutes)."
For longer work use Step Functions, AWS Batch, or ECS Fargate - don't
architect around the limit.

## Timeout vs deadline at runtime

Per [docs.aws.amazon.com/lambda python-context](https://docs.aws.amazon.com/lambda/latest/dg/python-context.html),
the Context object exposes `get_remaining_time_in_millis()` (Python) /
`getRemainingTimeInMillis()` (Node/JVM). Break out proactively:

```python
def handler(event, context):
    while not_done:
        if context.get_remaining_time_in_millis() < 5000:
            save_checkpoint()
            return {"status": "partial", "checkpoint": ...}
        do_work_chunk()
    return {"status": "complete"}
```

The 5-second cushion lets the handler return cleanly; without it the Lambda
is force-killed at timeout (no SIGTERM grace) and the caller gets a
504-equivalent.

## Billing semantics

Per [docs.aws.amazon.com/lambda lambda-pricing](https://docs.aws.amazon.com/lambda/latest/dg/lambda-pricing.html):

| Cost component | Detail |
|---|---|
| Request charge | $0.20 per 1M requests (us-east-1) |
| Compute charge | Memory-class × GB-seconds (billed per ms) |
| Init duration | Free; not billed (per AWS; historically has changed - verify current docs) |

GB-second formula: `memory_GB * duration_seconds`. A 512MB Lambda running
1000ms costs `0.5 * 1.0 * $0.0000166667 = $0.00000833`; per million 1s
invocations at 512MB: ~$8.54 including the request charge.

## Memory ↔ CPU relationship

Per [docs.aws.amazon.com/lambda configuration-memory](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html#configuration-memory-console):
"The amount of CPU available to a function is proportional to the memory you
allocate to it. At 1,769 MB, a function has the equivalent of one vCPU."
Compute-bound workloads should size memory by CPU need; the sweet spot is
usually the memory class where wall-clock time stops dropping (often
1024-2048MB).

## Integration timeout cascade

The integration's timeout is often the operational ceiling:

| Integration | Timeout | Lambda config |
|---|---|---|
| API Gateway (REST + HTTP API) | **29 seconds** (hard) | Lambda timeout MUST be < 29s |
| Application Load Balancer | 4s default; configurable to 4000s | Configurable both sides |
| CloudFront (Lambda@Edge) | 5s viewer functions; 30s origin | Tight viewer limit |
| SQS (event source) | Per-queue visibility timeout (default 30s) | Visibility > Lambda timeout × 6 (AWS recommendation) |
| DynamoDB Streams | 6h batch window | Per-batch limit |
| EventBridge (async) | Retries on timeout | Idempotency required |
| Step Functions | Per-task timeout; default 60s | Per-task tuning |

The **API Gateway 29-second hard limit** is the most-encountered surprise:
a Lambda configured for 60s still times out at 29s because API Gateway
gives up first.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Completes within timeout under prod load | k6 / load run against the deployed function |
| Graceful return via remaining-time check | Inject slowness; assert "partial", not 504 |
| API Gateway 29s budget honoured | Long-running endpoint via API GW URL; assert ≤ 29s |
| SQS visibility > Lambda timeout | Force a timeout; observe SQS re-delivery |
| Memory sweet spot found | Run at 256/512/1024/2048 MB; chart duration |
| Cost at p99 within budget | Latency × memory × invocations × price/GB-s at p99, not average |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Timeout = 900s "for safety" | Stuck Lambdas burn 15min; concurrency limits hit | Match timeout to p99 + buffer |
| Lambda timeout > API Gateway's 29s | API GW kills first; Lambda runs unused | Timeout < 29s behind API GW |
| SQS visibility < Lambda timeout | In-flight message re-delivered → duplicates | Visibility > timeout × 6 |
| No remaining-time check | Force-kill; no progress saved | Check + early-return |
| Sizing memory by RAM need only | Compute-bound work wastes wall-clock | Tune by p95 duration |
| Cost calculated from the average | p99 spikes blow the budget | Calculate against p99 |

## Notes

- Per-region pricing varies; the figures above are us-east-1.
- Workers / Edge have different models: Cloudflare Workers 10ms CPU free /
  50ms paid, 30s wall-clock; Vercel Edge Functions 30s wall-clock max.

## References

- Lambda configuration limits:
  [docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html)
- Lambda pricing:
  [docs.aws.amazon.com/lambda/latest/dg/lambda-pricing.html](https://docs.aws.amazon.com/lambda/latest/dg/lambda-pricing.html)
- AWS Lambda Powertools: [docs.powertools.aws.dev/lambda/](https://docs.powertools.aws.dev/lambda/)
