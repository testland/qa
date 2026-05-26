---
name: lambda-timeout-budget-reference
description: "Pure-reference catalog of AWS Lambda timeout + billing semantics. Covers Lambda's hard 15-minute (900s) wall-clock limit, the timeout-vs-deadline relationship (Lambda Context.getRemainingTimeInMillis), per-invocation billing (rounded to 1ms; per-invocation + duration × memory), the memory-vs-CPU relationship (CPU scales linearly with memory), the integration-timeout cascade (API Gateway 29s → Lambda 15min; SQS visibility-timeout vs Lambda timeout), and per-runtime nuances. Use when designing a Lambda's timeout config, debugging timeout-vs-billing surprises, or sizing memory for compute-bound workloads."
rating: 22
d6: 4
archetype: S2
---

# lambda-timeout-budget-reference

## Overview

AWS Lambda's wall-clock limit is **15 minutes (900 seconds)** per
invocation. Per
[docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html):
"The maximum value for timeout is 900 seconds."

## When to use

- Designing the timeout for a new Lambda.
- Debugging "Lambda silently truncates output" reports.
- Sizing memory for compute-bound work.
- Auditing API Gateway → Lambda → downstream timeout cascade.

## The 15-minute limit

Per AWS Lambda docs: 900 seconds (15 minutes) absolute maximum.
For longer work, use:

- AWS Step Functions (orchestrate multiple Lambdas)
- AWS Batch (containers; up to 14 days)
- ECS Fargate (containers; no time limit)

Don't try to architect around the 15-minute limit; pick the
right service.

## Timeout vs deadline at runtime

Per [docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/latest/dg/python-context.html):
the Lambda Context object exposes `get_remaining_time_in_millis()`
(Python), `getRemainingTimeInMillis()` (Node/JVM). Use it to
break out of work proactively:

```python
def handler(event, context):
    while not_done:
        if context.get_remaining_time_in_millis() < 5000:
            # Save progress, return early
            save_checkpoint()
            return {"status": "partial", "checkpoint": ...}
        do_work_chunk()
    return {"status": "complete"}
```

The 5-second cushion lets the handler return cleanly. Without
it, the Lambda is force-killed at timeout and the caller gets a
504-equivalent.

## Billing semantics

Per
[docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/latest/dg/lambda-pricing.html):

| Cost component | Detail |
|---|---|
| Request charge | $0.20 per 1M requests (us-east-1) |
| Compute charge | Memory-class × GB-seconds (per ms) |
| Init duration | Free; not billed (per AWS) |

GB-second formula: `memory_GB * duration_seconds`.

A 512MB Lambda running 1000ms costs:
`0.5 GB * 1.0 sec * $0.0000166667/GB-s = $0.00000833`

Per million invocations at 1s, 512MB: $8.34 (+ $0.20 request) =
$8.54.

Init duration billing was free as of 2023; this skill cites
current docs.

## Memory ↔ CPU relationship

Per
[docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html#configuration-memory-console):
"The amount of CPU available to a function is proportional to
the memory you allocate to it. At 1,769 MB, a function has the
equivalent of one vCPU."

Up to ~1769MB, you're paying for "memory" but getting "CPU."
Compute-bound workloads should size memory by CPU need, not
memory need.

A 256MB Lambda has ~14% of one vCPU. A 1.769GB Lambda has 1
full vCPU. A 3.5GB Lambda has 2 vCPUs.

The cost-vs-performance sweet spot is usually at the memory class
where wall-clock time stops dropping (often 1024-2048MB for
typical workloads).

## Integration cascade

Lambda is rarely invoked directly; the **integration's
timeout** is often the operational ceiling:

| Integration | Timeout | Lambda config |
|---|---|---|
| API Gateway (REST + HTTP API) | **29 seconds** (hard) | Lambda timeout MUST be < 29s |
| Application Load Balancer | 4 seconds default; configurable to 4000s | Configurable both sides |
| CloudFront (Lambda@Edge viewer-request/response) | 5s for viewer functions; 30s for origin | Tight viewer limit |
| SQS (event source) | Configured per queue; default 30s visibility | Lambda timeout < visibility timeout |
| DynamoDB Streams | 6 hours batch window | Lambda timeout per-batch limit |
| EventBridge (async) | Async; retries on timeout | Idempotency required |
| Step Functions | Each task has its own timeout; default 60s | Per-task tuning |

The **API Gateway 29-second hard limit** is the most-encountered
surprise: a Lambda configured for 60s still times out at 29s
because API Gateway gives up first.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Lambda completes within timeout under prod load | Run k6 / Lambda Test against deployed function |
| Graceful return via remaining-time check | Inject artificial slowness; verify handler returns "partial" not 504 |
| API Gateway 29s budget honoured | Test long-running endpoint via API GW URL; assert ≤ 29s |
| SQS visibility-timeout > Lambda timeout | Force a timeout; observe re-delivery from SQS |
| Memory tuning sweet spot found | Run at 256/512/1024/2048 MB; chart duration |
| Cost at p99 within budget | Latency × memory × invocations × price-per-GB-s |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Lambda timeout = max (900s) for "safety" | Stuck Lambdas burn 15min before failing; concurrent-execution limits hit | Match timeout to actual p99 + buffer |
| Lambda timeout > API Gateway timeout | API GW kills first; Lambda runs unused | Timeout < 29s for API GW |
| SQS visibility-timeout < Lambda timeout | Message re-delivered while in-flight → duplicate processing | Visibility > Lambda timeout × 6 (AWS recommendation) |
| No `get_remaining_time_in_millis()` check | Force-kill at timeout; no progress saved | Always check + early-return |
| Sizing memory by RAM need only | Compute-bound work wastes time | Tune by p95 duration |
| Treating init time as billed | Out of date | Per current AWS docs, init is free |
| Cost calculation ignoring p99 | "It's $5/million on average" but p99 spikes blow budget | Calculate against p99 not avg |

## Limitations

- **Lambda is hard-killed at timeout.** No SIGTERM grace; the
  process is frozen. Plan around this.
- **Init phase rules can change.** AWS has changed Init billing
  historically; check current pricing.
- **Per-region pricing varies.** Above examples are us-east-1;
  ap-northeast-1 / eu-* differ.
- **Cold-start latency adds to budget.** Per
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md),
  cold start time is **billed compute time** as Init phase
  (currently free, but counted in Init Duration).
- **Workers / Edge / Vercel have different timeout models.**
  Cloudflare Workers: 10ms CPU time on free, 50ms on paid, 30s
  wall-clock total. Vercel Edge Functions: 30s wall-clock max.

## References

- Lambda configuration limits:
  [docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html).
- Lambda pricing:
  [docs.aws.amazon.com/lambda/latest/dg/lambda-pricing.html](https://docs.aws.amazon.com/lambda/latest/dg/lambda-pricing.html).
- AWS Lambda Powertools:
  [docs.powertools.aws.dev/lambda/](https://docs.powertools.aws.dev/lambda/).
- Companion catalog:
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md).
- Consumed by:
  [`aws-sam-local-testing`](../aws-sam-local-testing/SKILL.md),
  [`lambda-test-tools-net`](../lambda-test-tools-net/SKILL.md),
  [`serverless-framework-test-plugin`](../serverless-framework-test-plugin/SKILL.md),
  [`serverless-integration-test-builder`](../serverless-integration-test-builder/SKILL.md).
