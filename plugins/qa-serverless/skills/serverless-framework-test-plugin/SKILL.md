---
name: serverless-framework-test-plugin
description: "Wraps the Serverless Framework (serverless.com) test ecosystem: serverless-offline (local HTTP emulator), serverless-jest-plugin / serverless-mocha-plugin (per-runtime test runners), and the `serverless invoke local` CLI for one-off invocations. Use when testing Lambda functions deployed via the Serverless Framework. Composes cold-start-budget-reference + lambda-timeout-budget-reference."
rating: 21
d6: 4
archetype: S1
---

# serverless-framework-test-plugin

## Overview

The Serverless Framework
([serverless.com/framework/docs](https://www.serverless.com/framework/docs))
is one of the older deploy-frameworks for Lambda. Its
test-friendly ecosystem includes:

- **serverless-offline** — emulates API Gateway + Lambda
  locally; HTTP test surface.
- **serverless invoke local** — one-off invocation from CLI.
- **Per-runtime test plugins** (serverless-jest-plugin,
  serverless-mocha-plugin) — install runners aware of
  serverless project structure.

## When to use

- Lambda projects deployed via Serverless Framework.
- Tests that exercise API Gateway routing locally.
- Existing serverless-jest / -mocha tooling.

## Authoring

### Install

```bash
npm install -g serverless
npm install --save-dev serverless-offline serverless-jest-plugin jest
```

### serverless.yml plugin registration

```yaml
plugins:
  - serverless-offline
  - serverless-jest-plugin

functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

### serverless invoke local (single invocation)

```bash
serverless invoke local --function hello --data '{"name":"world"}'
```

Output: handler's return value (JSON), plus emulated Lambda log
lines.

### serverless-offline (local HTTP)

```bash
serverless offline --httpPort 3000
```

Now `curl http://localhost:3000/hello` exercises the full
Serverless → API Gateway → Lambda route.

### serverless-jest-plugin

Per [npmjs.com/package/serverless-jest-plugin](https://www.npmjs.com/package/serverless-jest-plugin):

```bash
serverless create test --function hello   # Generates test scaffold
serverless invoke test                     # Runs tests
```

The scaffold uses Jest under the hood; tests follow standard
Jest patterns:

```typescript
import { hello } from '../handler';

test('returns greeting', async () => {
  const event = { queryStringParameters: { name: 'world' } };
  const response = await hello(event);
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body).message).toContain('Hello world');
});
```

### Direct handler test (lightweight)

```typescript
// handler.ts
export const hello = async (event: any) => ({
  statusCode: 200,
  body: JSON.stringify({ message: `Hello ${event.queryStringParameters?.name ?? 'World'}` }),
});

// handler.test.ts
import { hello } from './handler';

test('hello-world', async () => {
  const result = await hello({ queryStringParameters: {} });
  expect(result.statusCode).toBe(200);
});
```

This skips the Serverless plugin entirely — often the cleanest
path.

### Environment variables

`serverless-offline` reads `serverless.yml` env definitions:

```yaml
provider:
  environment:
    DATABASE_URL: ${env:DATABASE_URL}
```

Tests should mirror this via `process.env.DATABASE_URL` in jest
setup.

## Running

```bash
npx jest                                  # Direct handler tests
serverless offline                        # Local HTTP emulator
serverless invoke local --function hello  # CLI one-off
```

## CI integration

```yaml
jobs:
  serverless-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx jest
```

For deployed-Lambda smoke tests:

```yaml
      - run: serverless deploy --stage staging
      - run: npx jest tests/staging-smoke/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests use `serverless invoke local` per test | Subprocess startup cost; slow | Direct handler invocation |
| Skip `serverless offline` for routing tests | API Gateway routing untested | Use `serverless offline` for HTTP tests |
| Hardcoded env vars in test code | Drift from serverless.yml | Load via dotenv from .env.test |
| Mocking `event` object incompletely | Handler reads `event.headers` → undefined | Use [`aws-sam-local-testing`](../aws-sam-local-testing/SKILL.md) `generate-event` |
| Serverless plugin pinned to old version | Behaviour drift vs prod Lambda runtime | Match Lambda runtime version |
| No deployed smoke tests | Local-pass + prod-fail gap | Always include staging smoke |
| Treating serverless-jest as replacement for direct test | Adds plugin complexity for no gain | Use plain Jest |

## Limitations

- **Serverless Framework is one deploy tool of many.** SAM,
  CDK, Terraform also deploy Lambdas; this skill is
  Serverless-specific.
- **serverless-offline mirrors API Gateway but isn't identical.**
  Subtle differences in CORS, multi-value headers.
- **Cold-start budget per [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md).**
  Local invocation doesn't simulate Lambda cold start.
- **Plugin ecosystem maintenance varies.** serverless-jest is
  community-maintained; serverless-offline is well-maintained.

## References

- Serverless Framework docs:
  [serverless.com/framework/docs](https://www.serverless.com/framework/docs).
- serverless-offline:
  [github.com/dherault/serverless-offline](https://github.com/dherault/serverless-offline).
- serverless-jest-plugin:
  [npmjs.com/package/serverless-jest-plugin](https://www.npmjs.com/package/serverless-jest-plugin).
- Companion catalogs:
  [`cold-start-budget-reference`](../cold-start-budget-reference/SKILL.md),
  [`lambda-timeout-budget-reference`](../lambda-timeout-budget-reference/SKILL.md).
- Sibling tools (equivalent for other frameworks):
  [`aws-sam-local-testing`](../aws-sam-local-testing/SKILL.md),
  [`lambda-test-tools-net`](../lambda-test-tools-net/SKILL.md).
- Builder:
  [`serverless-integration-test-builder`](../serverless-integration-test-builder/SKILL.md).
