---
name: serverless-integration-test-builder
description: "Workflow-driven skill that builds the integration-test suite for a serverless application from its IaC definition (SAM template / serverless.yml / Wrangler config / Vercel functions / Netlify functions). Walks through: identifying the function inventory + event sources, picking the right local-emulator per function (sam local / Miniflare / netlify dev / vercel dev / serverless-offline), generating test events per event source, asserting on cold-start + timeout budgets, and emitting the test directory + CI config. Use when introducing integration tests to a serverless project."
---

# serverless-integration-test-builder

## Overview

Serverless integration tests are awkward because the test
surface is **multi-tool**: each platform has its own local
emulator, event-source binding model, and cold-start
characteristic. This skill produces a coherent test directory
from the IaC definition.

The output: a test directory layout + per-function test files
+ CI config.

## When to use

- New serverless project; need integration test coverage.
- Inherited a serverless project with no tests; need to build
  coverage.
- Migrating between platforms (e.g., Lambda → Workers); need to
  port test discipline.

## Step 1 - Inventory functions from IaC

Per platform:

| Platform | IaC source | Where functions live |
|---|---|---|
| AWS SAM | `template.yaml` `AWS::Serverless::Function` | `Resources.<name>` |
| Serverless Framework | `serverless.yml` `functions:` | each entry |
| Cloudflare Workers | `wrangler.toml` + script bindings | `[[durable_objects.bindings]]`, scripts |
| Vercel | `pages/api/` + `app/api/` + middleware | filesystem-derived |
| Netlify | `netlify/functions/`, `netlify/edge-functions/` | filesystem-derived |

```bash
# Example: SAM
yq '.Resources | to_entries | map(select(.value.Type == "AWS::Serverless::Function")) | .[].key' template.yaml

# Example: Serverless Framework
yq '.functions | keys' serverless.yml
```

Output: a function inventory:

```yaml
functions:
  - name: get-user
    platform: aws-sam
    runtime: nodejs20.x
    handler: src/get-user.handler
    timeout: 10
    memory: 512
    events:
      - type: api
        path: /users/{id}
        method: GET
  - name: process-upload
    platform: aws-sam
    runtime: python3.12
    timeout: 300
    events:
      - type: s3
        bucket: uploads
        events: ['s3:ObjectCreated:*']
```

## Step 2 - Pick the emulator per function

**Default: pick one emulator per platform detected in Step 1's inventory** - 
the per-platform skill below is the canonical driver for that runtime. Use
multiple emulators only when the project mixes platforms (e.g., Vercel app
+ AWS Lambdas).

| Platform | Test path | Skill |
|---|---|---|
| AWS Lambda (Node/Python/etc.) | `sam local invoke` or direct handler | [`aws-sam-local-testing`](../aws-sam-local-testing/SKILL.md) |
| AWS Lambda (.NET) | Amazon.Lambda.TestUtilities | [`lambda-test-tools-net`](../lambda-test-tools-net/SKILL.md) |
| Cloudflare Workers | vitest-pool-workers / Miniflare | [`cloudflare-workers-miniflare`](../cloudflare-workers-miniflare/SKILL.md) |
| Vercel Edge | @edge-runtime/jest-environment | [`vercel-edge-runtime-testing`](../vercel-edge-runtime-testing/SKILL.md) |
| Netlify Functions | netlify dev + direct handler | [`netlify-functions-tests`](../netlify-functions-tests/SKILL.md) |
| Serverless Framework | serverless-offline / direct | [`serverless-framework-test-plugin`](../serverless-framework-test-plugin/SKILL.md) |

## Step 3 - Generate test events per event source

| Event source | Tool |
|---|---|
| API Gateway request | `sam local generate-event apigateway aws-proxy` |
| S3 object created | `sam local generate-event s3 put` |
| SQS message | `sam local generate-event sqs receive-message` |
| DynamoDB Streams | `sam local generate-event dynamodb update` |
| EventBridge | `sam local generate-event events` |
| Cloudflare Workers `fetch` | `new Request('https://...')` directly |
| Vercel/Netlify | construct `Request` object |

Commit events to `tests/fixtures/events/`. Reference in tests.

## Step 4 - Emit test scaffold per function

```
tests/
  integration/
    get-user.test.ts
    process-upload.test.ts
  fixtures/
    events/
      api-get-users-id.json
      s3-object-created.json
    payloads/
      user-1.json
  conftest.py             # Or jest setup
  README.md               # How to run + matrix
```

Per-function test:

```typescript
// tests/integration/get-user.test.ts
import { handler } from '../../src/get-user';
import event from '../fixtures/events/api-get-users-id.json';

describe('get-user', () => {
  test('returns 200 for valid id', async () => {
    const response = await handler({ ...event, pathParameters: { id: '1' } } as any, {} as any);
    expect(response.statusCode).toBe(200);
  });

  test('returns 404 for missing id', async () => {
    const response = await handler({ ...event, pathParameters: { id: 'missing' } } as any, {} as any);
    expect(response.statusCode).toBe(404);
  });

  test('completes within timeout budget', async () => {
    // Per lambda-timeout-budget-reference: timeout=10s; want headroom
    const start = Date.now();
    await handler({ ...event, pathParameters: { id: '1' } } as any, {} as any);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);  // 50% of timeout
  });
});
```

## Step 5 - Cold-start + timeout budget assertions

For each function, derive a budget from
[`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md)
+ [`lambda-timeout-budget-reference`](../lambda-timeout-budget-reference/SKILL.md).

Typical cold starts per runtime (per AWS / Cloudflare / Vercel
docs; bigger packages and memory classes skew higher):

| Runtime | Typical cold start |
|---|---|
| AWS Lambda Node.js (256MB) | 200-700ms |
| AWS Lambda Python (256MB) | 250-800ms |
| AWS Lambda Java 11 (512MB, no SnapStart) | 1.5-6s |
| AWS Lambda Java 11 (512MB, [SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)) | 100-300ms |
| AWS Lambda .NET (1GB) | 1-3s |
| AWS Lambda Go (256MB) | 100-300ms |
| AWS Lambda Rust (256MB) | 50-200ms |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/) | 0-5ms (V8 isolate spawn) |
| Vercel Edge Runtime | 5-30ms |
| Vercel Node.js Functions | 200-500ms (small) to 2-3s (large) |
| Netlify Functions | 300ms-2s |

The upstream integration - not the function's own `timeout` - is
usually the operational ceiling (per
[docs.aws.amazon.com/lambda](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html);
Lambda's hard maximum is 900s):

| Integration | Timeout ceiling |
|---|---|
| API Gateway (REST + HTTP API) | **29s hard** - function timeout must be < 29s |
| Application Load Balancer | 4s default; configurable to 4000s |
| CloudFront Lambda@Edge | 5s viewer functions; 30s origin functions |
| SQS event source | Per-queue visibility timeout (default 30s); function timeout must be below it |
| DynamoDB Streams | 6-hour batch window; per-batch function limit |
| EventBridge (async) | Async with retry on timeout - requires idempotency |
| Step Functions | Per-task timeout, default 60s |
| Cloudflare Workers | 10ms CPU (free) / 50ms CPU (paid); 30s wall-clock |
| Vercel Edge Functions | 30s wall-clock max |

Set the assertion threshold at roughly 50% of the binding ceiling
so a regression trips the test before it trips production:

```yaml
budgets:
  get-user:
    cold_start_p99_ms: 800       # AWS Lambda Node@512MB typical
    warm_p99_ms: 200
    timeout_s: 10
    integration_timeout: api-gateway-29s   # API GW < 29s

  process-upload:
    cold_start_p99_ms: 1500
    warm_p99_ms: 2000
    timeout_s: 300
    integration_timeout: s3-event-async    # No upstream limit
```

These become assertion thresholds in `staging-smoke` tests (run
against deployed functions, not local).

## Step 6 - CI integration

```yaml
# .github/workflows/serverless-tests.yml
jobs:
  local-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - uses: aws-actions/setup-sam@v2
      - run: sam build --use-container
      - run: npm ci && npx jest tests/integration/

  staging-deploy-and-smoke:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: local-tests
    steps:
      - uses: actions/checkout@v5
      - run: sam deploy --stack-name staging --parameter-overrides Stage=staging
      - run: npx jest tests/staging-smoke/
```

Two-tier: local-fast tests on every PR; deploy + smoke on main.

## Step 7 - Document coverage matrix

```markdown
# Serverless Integration Test Matrix

## Functions covered

| Function | Local test | Cold-start test | Timeout test | Event sources |
|---|---|---|---|---|
| get-user | ✅ tests/integration/get-user.test.ts | staging only | ✅ <5s | API GW GET /users/{id} |
| process-upload | ✅ | staging only | ✅ <150s of 300s | S3 ObjectCreated |
| ... | | | | |

## Gaps

- `legacy-export` - no integration tests; on backlog.
- Cold-start tests not feasible locally for any function (per [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md)).

## How to add a new function

1. Add to IaC.
2. Generate event fixture.
3. Add test file following the template.
4. Update this matrix.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One emulator for all functions | Mixed-platform tests are awkward; some emulators miss platform-specific behaviour | Per-platform emulator |
| No staging deploy + smoke tests | Local-pass + prod-fail gap | Two-tier CI |
| Hand-rolled event payloads | Schema drift; missed fields | Use `sam local generate-event` or commit fixtures |
| Skip cold-start budget assertions | p99 spikes go unnoticed | Per-function budget in staging smoke |
| Test directory mixed with prod code | `tests/` dir not in deploy artifact | Keep separate |
| No README documenting matrix | Future maintainers can't add functions consistently | Step 7 README |
| Inflate jest test timeouts to mask slow handlers | Hides performance regression | Match jest timeout to function timeout |
| Mock AWS SDK in all tests | Tests pass; IAM permission bugs hide | Use LocalStack or real test account |

## Output

This skill produces:

- A function inventory (Step 1).
- Per-function test files using the right emulator (Steps 2-4).
- A budget matrix (Step 5).
- A two-tier CI config (Step 6).
- A coverage matrix README (Step 7).

## References

- Companion catalogs:
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md),
  [`lambda-timeout-budget-reference`](../lambda-timeout-budget-reference/SKILL.md).
- Per-platform tools:
  [`aws-sam-local-testing`](../aws-sam-local-testing/SKILL.md),
  [`lambda-test-tools-net`](../lambda-test-tools-net/SKILL.md),
  [`cloudflare-workers-miniflare`](../cloudflare-workers-miniflare/SKILL.md),
  [`vercel-edge-runtime-testing`](../vercel-edge-runtime-testing/SKILL.md),
  [`netlify-functions-tests`](../netlify-functions-tests/SKILL.md),
  [`serverless-framework-test-plugin`](../serverless-framework-test-plugin/SKILL.md).
- Cross-plugin:
  `testcontainers` (in the qa-test-environment plugin)
  - LocalStack alternative for AWS-service emulation.
