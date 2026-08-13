---
name: cold-start-budget-reference
description: "Pure-reference catalog of latency budgets across serverless runtimes: cold starts AND timeouts. Covers AWS Lambda's three-phase cold start (Init: download+unzip+runtime-bootstrap; Init code: imports + module load; Invoke: handler execution), Cloudflare Workers' isolate model (sub-millisecond cold starts via V8 isolates per developers.cloudflare.com), Vercel Edge Runtime, Lambda SnapStart for JVM (snapshot-restore for Java), and provisioned-concurrency trade-offs, plus Lambda timeout + billing budgets in references/timeout-budgets.md (the 15-minute hard limit, getRemainingTimeInMillis, per-ms billing, memory-CPU scaling, the API Gateway 29s / SQS visibility-timeout integration cascade). Use when designing latency or timeout budgets, choosing a runtime, sizing memory, or auditing cold-start variance in production."
---

# cold-start-budget-reference

## Overview

Per [aws.amazon.com/blogs/compute on cold starts](https://aws.amazon.com/blogs/compute/),
Lambda's cold start has three phases:

1. **Init** - download deployment package, unzip, bootstrap
   the runtime (Node/Python/Java/etc.).
2. **Init code** - execute module-level imports + global setup.
3. **Invoke** - the actual handler call.

Phases 1 + 2 are the "cold" part. Phase 3 is what runs every
invocation (cold or warm).

## When to use

- Designing a latency budget for a Lambda / Workers / Edge
  function.
- Investigating "p95 is fine but p99 is 5s."
- Choosing a runtime - Cloudflare's isolate model is qualitatively
  different from Lambda containers.
- Auditing provisioned-concurrency / SnapStart configurations.

## How to use

1. Look up the runtime's typical range in the per-runtime budget table
   (e.g. Node.js 256MB is 200-700ms; Java 11 without SnapStart is 1.5-6s).
2. Set the latency budget as two lines: p50/p95 tracks warm performance, and
   a separate p99 line absorbs the cold-start tail.
3. Force a cold start (deploy, or wait past the idle-evict window) and record
   p95 first-invocation latency against the budget.
4. If cold starts breach budget, apply the matching mitigation from below:
   SnapStart (JVM/.NET), provisioned concurrency, package-size trimming, lazy
   imports, or a pre-compiled runtime (Go/Rust).
5. Add the build-step and monitoring assertions from Testable behaviours
   (zipped artifact < 50MB, init phase < 500ms, CloudWatch `Init Duration`).
6. Re-measure after each change and confirm the p99 tail moved, not just p50/p95.

## Per-runtime cold-start budgets

Per AWS, Cloudflare, Vercel docs (typical ranges; bigger
packages and bigger memory-class skew higher):

| Runtime | Typical cold start | Architecture |
|---|---|---|
| AWS Lambda Node.js (256MB) | 200-700ms | Container (Firecracker microVM) |
| AWS Lambda Python (256MB) | 250-800ms | Container |
| AWS Lambda Java 11 (512MB, no SnapStart) | 1.5-6s | Container + JVM warmup |
| AWS Lambda Java 11 (512MB, **SnapStart**) | 100-300ms | Snapshot-restore per [docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) |
| AWS Lambda .NET (1GB) | 1-3s | Container + .NET runtime |
| AWS Lambda Go (256MB) | 100-300ms | Container; pre-compiled binary |
| AWS Lambda Rust (256MB) | 50-200ms | Container; pre-compiled binary |
| Cloudflare Workers | 0-5ms (V8 isolate spawn) | V8 isolate per [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/) |
| Vercel Edge Runtime | 5-30ms | V8 isolate (similar to Workers) |
| Vercel Node.js Functions | 200-500ms (small) to 2-3s (large) | Lambda under the hood |
| Netlify Functions | 300ms-2s | Lambda under the hood |

The "Workers / Edge" qualitative leap is the isolate model:
each function is a V8 isolate, spun up in microseconds per
[developers.cloudflare.com](https://developers.cloudflare.com/workers/) - 
no container, no OS startup.

## Mitigations

### Provisioned concurrency (AWS Lambda)

Per [docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/):
keeps N execution environments pre-initialised. Eliminates cold
starts up to N concurrent requests; you pay for the keep-warm
time.

Trade-off: cost. A constant N=10 provisioned concurrency for 30
days ≈ $30-300 depending on memory class.

### Lambda SnapStart (Java / .NET)

Per [docs.aws.amazon.com/lambda/latest/dg/snapstart.html](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html):
takes a snapshot of the initialised JVM and restores from it on
each cold start. Reduces Java cold starts from 1.5-6s → 100-300ms.

Caveats:
- State snapshot includes connections, random seeds; can't have
  per-instance unique values frozen.
- Hooks `beforeCheckpoint` / `afterRestore` let you re-prime
  non-serializable state.

### Package-size discipline

Lambda cold-start scales with deployment-package size. Per AWS:
keep under 50MB (zipped) → cold start in the 200-800ms range.
Larger packages → seconds.

### Avoid heavy module-level imports

Init code runs once but on every cold start. Heavy imports
(database connection pool init, large dependency trees) inflate
init time.

```python
# Bad: top-level
import heavy_lib            # 2s import time
def handler(event, ctx):
    return heavy_lib.do_thing(event)

# Better: lazy-import
def handler(event, ctx):
    import heavy_lib
    return heavy_lib.do_thing(event)
```

Lazy imports add per-warm-call latency but reduce cold-start
spike.

### Runtime choice

Pre-compiled runtimes (Go, Rust) have far lower cold starts than
managed runtimes (Java, Python). For latency-critical paths,
runtime choice is a primary lever.

## Timeout budgets

Cold start is the front of the latency budget; the back is the timeout.
Lambda's 15-minute hard limit, the `getRemainingTimeInMillis` early-return
pattern, per-ms billing and the memory-CPU relationship, and the
integration timeout cascade (API Gateway's hard 29s, SQS visibility
timeouts, Lambda@Edge limits) are cataloged in
[references/timeout-budgets.md](references/timeout-budgets.md).

## Testable behaviours

| Behaviour | Test |
|---|---|
| Cold start within budget | Force cold (deploy or wait > idle-evict time); measure p95 first-invocation latency |
| Warm performance | Subsequent invocations (50+) → p95 well within prod budget |
| SnapStart effective | Pre/post SnapStart cold start delta |
| Provisioned concurrency keeps warm | Run for an hour; no cold-start spikes observed |
| Package size in budget | Build-step assertion: zipped artifact < 50MB |
| No heavy init-time imports | Profile init phase; assert < 500ms |

## Worked example

A Java 11 Lambda (512MB) serves a low-traffic checkout callback. Users report
occasional multi-second waits, though the dashboard p95 looks healthy.

1. The per-runtime table puts Java 11 without SnapStart at 1.5-6s cold start;
   p95 hides it because cold starts land in the p99 tail.
2. Enable SnapStart, which snapshot-restores the initialised JVM and drops the
   cold start to the 100-300ms range.
3. Re-prime non-serializable state in an `afterRestore` hook so a stale pooled
   DB connection is not frozen into the snapshot.
4. Force a cold start (wait past idle-evict) and compare `Init Duration`
   before and after; confirm the p99 line, not just p95, falls.

Result: the cold-start tail drops from ~5s to the 100-300ms range with no
provisioned-concurrency spend.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| p99 latency surprise | Cold starts at the tail; not visible in p50/p95 | Watch p99; explicit cold-start monitoring (CloudWatch Init Duration metric) |
| Large dependency tree on init path | Cold start inflated 2-5x | Audit imports; lazy-import non-critical |
| Java on Lambda without SnapStart | 5s cold starts | Enable SnapStart |
| Provisioned concurrency without size analysis | Pay for unused warm instances | Tune to actual concurrency p99 |
| Cold-start test only on the local dev environment | Local doesn't simulate Lambda init | Deploy + test against AWS / Workers / Edge |
| Treat cold starts as "rare" | Bursty traffic → cold starts cluster | Account for both steady-state and burst patterns |
| Ignore module bundling | Webpack-bundled is smaller AND has fewer import resolution hops | Bundle for production Lambdas |

## Limitations

- **Cold-start measurement is platform-side.** CloudWatch
  `Init Duration` metric is canonical for Lambda; Workers /
  Edge expose their own.
- **SnapStart caveats are subtle.** State that survives the
  snapshot may be wrong (random seeds, connection state).
- **Provisioned-concurrency is regional.** Multi-region
  Lambdas need PC per region.
- **Workers / Edge are not free of all variance.** First request
  per (script, region) still has 5-30ms init.
- **Doesn't address steady-state throughput.** Cold start is one
  metric; concurrency-limit + duration are separate.

## References

- AWS Lambda cold-start blog:
  [aws.amazon.com/blogs/compute](https://aws.amazon.com/blogs/compute/).
- Lambda SnapStart:
  [docs.aws.amazon.com/lambda/latest/dg/snapstart.html](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html).
- Cloudflare Workers isolate model:
  [developers.cloudflare.com/workers/reference/how-workers-works](https://developers.cloudflare.com/workers/reference/how-workers-works/).
- Vercel Edge Runtime:
  [vercel.com/docs/functions/edge-runtime](https://vercel.com/docs/functions/edge-runtime).
- Timeout + billing budgets:
  [references/timeout-budgets.md](references/timeout-budgets.md).
- Consumed by:
  `aws-sam-local-testing`,
  `cloudflare-workers-miniflare`,
  `serverless-integration-test-builder`.
