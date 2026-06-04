---
name: openfeature-sdk-testing
description: "Wraps OpenFeature (CNCF vendor-neutral SDK abstraction) testing patterns: the InMemoryProvider for hermetic tests without network calls, provider registration via OpenFeature.setProvider, the getBooleanValue/getBooleanDetails evaluation API with EvaluationDetails (value, variant, reason, errorCode), hooks for evaluation side-effects, and evaluation context for targeting-rule tests. Covers TypeScript, Java, and Python SDKs. Use when writing tests for code that resolves feature flags through the OpenFeature SDK regardless of the underlying flag management platform. Composes feature-flag-test-matrix-reference."
rating: 23
d6: 4
keywords:
  - openfeature
  - feature-flags
  - cncf
  - hermetic-tests
  - in-memory-provider
---

# openfeature-sdk-testing

## Overview

OpenFeature is a CNCF project that standardises how applications
resolve feature flags. Per
[openfeature.dev/docs/reference/concepts/provider](https://openfeature.dev/docs/reference/concepts/provider),
providers are the component responsible for executing flag evaluations,
and "an application integrator can register one provider at a time."
The SDK ships an `InMemoryProvider` in every language that substitutes
real flag-management infrastructure with in-process flag state, letting
unit and integration tests run without any network call. The production
evaluation path (targeting logic, type coercion, defaults) is exercised
in full; only the data source is swapped.

**Differentiation from sibling skills:**
`launchdarkly-testing`, `unleash-testing`, `flagsmith-testing`, and
`growthbook-testing` wrap each vendor's own `TestData`/bootstrap API.
This skill covers the vendor-neutral OpenFeature layer teams adopt when
they want to keep application code decoupled from a specific provider.

## When to use

- Tests for code that calls `client.getBooleanValue()` / `get_boolean_value()`
  through the OpenFeature SDK, regardless of which provider runs in
  production.
- Tests asserting on evaluation details: variant name, reason code,
  or error code (e.g., `FLAG_NOT_FOUND`, `TYPE_MISMATCH`).
- Tests that inject hook logic (telemetry, validation) exercised during
  flag evaluation.
- Teams migrating between flag providers who want tests that survive the
  swap.
- Assignment-integrity tests per
  [`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md).

## How to use

### TypeScript / Node.js

**Install** (per
[github.com/open-feature/js-sdk README](https://github.com/open-feature/js-sdk/blob/main/packages/server/README.md)):

```bash
npm install --save @openfeature/server-sdk
```

**Configure the InMemoryProvider** with flag variants and a default
variant:

```typescript
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

const flags = {
  'show-new-ui': {
    variants: { on: true, off: false },
    disabled: false,
    defaultVariant: 'on',
  },
  'checkout-v2': {
    variants: { enabled: true, disabled: false },
    disabled: false,
    defaultVariant: 'disabled',
  },
} as const;

await OpenFeature.setProvider(new InMemoryProvider(flags));
const client = OpenFeature.getClient();
```

**Evaluate flags** using the typed evaluation API (per
[openfeature.dev/docs/reference/concepts/evaluation-api](https://openfeature.dev/docs/reference/concepts/evaluation-api)):

```typescript
// Returns the resolved value; falls back to default on error
const enabled = await client.getBooleanValue('show-new-ui', false);

// Returns full EvaluationDetails
const details = await client.getBooleanDetails('show-new-ui', false);
// details.value    - the resolved boolean
// details.variant  - e.g. "on"
// details.reason   - e.g. "STATIC", "DEFAULT", "TARGETING_MATCH"
// details.errorCode- e.g. "FLAG_NOT_FOUND" when the flag is absent
```

**Typical test pattern:**

```typescript
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

describe('checkout feature', () => {
  let client: Client;

  beforeAll(async () => {
    await OpenFeature.setProvider(new InMemoryProvider({
      'checkout-v2': {
        variants: { enabled: true, disabled: false },
        disabled: false,
        defaultVariant: 'disabled',
      },
    }));
    client = OpenFeature.getClient();
  });

  afterAll(() => OpenFeature.close());

  it('returns false when flag defaults to disabled', async () => {
    const value = await client.getBooleanValue('checkout-v2', false);
    expect(value).toBe(false);
  });

  it('returns details with reason STATIC for static flags', async () => {
    const details = await client.getBooleanDetails('checkout-v2', false);
    expect(details.reason).toBe('STATIC');
  });

  it('returns FLAG_NOT_FOUND error code for unknown flag', async () => {
    const details = await client.getBooleanDetails('unknown-flag', false);
    expect(details.errorCode).toBe('FLAG_NOT_FOUND');
  });
});
```

### Java

**Install** (Maven, per
[github.com/open-feature/java-sdk README](https://github.com/open-feature/java-sdk/blob/main/README.md)):

```xml
<dependency>
  <groupId>dev.openfeature</groupId>
  <artifactId>sdk</artifactId>
  <version>1.20.2</version>
</dependency>
```

**Configure the InMemoryProvider:**

```java
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.providers.memory.Flag;
import dev.openfeature.sdk.providers.memory.InMemoryProvider;

Map<String, Flag<?>> flags = new HashMap<>();
flags.put("show-new-ui", Flag.builder()
    .variant("on", true)
    .variant("off", false)
    .defaultVariant("on")
    .build());

OpenFeatureAPI api = OpenFeatureAPI.getInstance();
api.setProviderAndWait(new InMemoryProvider(flags));
Client client = api.getClient();
```

**Evaluate flags:**

```java
boolean enabled = client.getBooleanValue("show-new-ui", false);

FlagEvaluationDetails<Boolean> details =
    client.getBooleanDetails("show-new-ui", false);
// details.getValue()    - resolved value
// details.getVariant()  - "on" or "off"
// details.getReason()   - "STATIC", "DEFAULT", etc.
// details.getErrorCode()- ErrorCode.FLAG_NOT_FOUND, TYPE_MISMATCH, etc.
```

### Python

**Install** (per
[github.com/open-feature/python-sdk README](https://github.com/open-feature/python-sdk/blob/main/README.md)):

```bash
pip install openfeature-sdk==0.10.0
```

**Configure the InMemoryProvider:**

```python
from openfeature import api
from openfeature.provider.in_memory_provider import InMemoryFlag, InMemoryProvider

flags = {
    "show-new-ui": InMemoryFlag(
        default_variant="on",
        variants={"on": True, "off": False}
    ),
}

api.set_provider_and_wait(InMemoryProvider(flags))
client = api.get_client()
```

**Evaluate flags:**

```python
enabled = client.get_boolean_value("show-new-ui", False)

details = client.get_boolean_details("show-new-ui", False)
# details.value       - resolved value
# details.variant     - "on" / "off"
# details.reason      - "STATIC", "DEFAULT", etc.
# details.error_code  - "FLAG_NOT_FOUND", "TYPE_MISMATCH", etc.
```

## EvaluationDetails and reason codes

Per the OpenFeature specification
([openfeature.dev/specification/sections/flag-evaluation](https://openfeature.dev/specification/sections/flag-evaluation),
Requirements 1.4.3-1.4.15), `EvaluationDetails` carries:

| Field | Type | Meaning |
|---|---|---|
| `value` | T | Resolved flag value (spec req. 1.4.3) |
| `flagKey` | string | The requested flag identifier (1.4.5) |
| `variant` | string | Provider-supplied variant name (1.4.6) |
| `reason` | string | Resolution rationale (1.4.7) |
| `errorCode` | enum | Failure classification (1.4.8) |
| `errorMessage` | string | Optional context for the error (1.4.13) |
| `flagMetadata` | map | Immutable provider-supplied data (1.4.14) |

Canonical reason values (per
[openfeature.dev/specification/sections/providers](https://openfeature.dev/specification/sections/providers),
Requirement 2.2.5):
`STATIC`, `DEFAULT`, `TARGETING_MATCH`, `SPLIT`, `CACHED`,
`DISABLED`, `UNKNOWN`, `STALE`, `ERROR`.

Canonical error codes include `FLAG_NOT_FOUND`, `TYPE_MISMATCH`,
`PARSE_ERROR`, `TARGETING_KEY_MISSING`, `INVALID_CONTEXT`, `GENERAL`,
`PROVIDER_NOT_READY`, `PROVIDER_FATAL`.

## Evaluation context for targeting-rule tests

Evaluation context is "a container for arbitrary contextual data that
can be used as a basis for dynamic evaluation" (per
[openfeature.dev/docs/reference/concepts/evaluation-context](https://openfeature.dev/docs/reference/concepts/evaluation-context)).
The targeting key is a unique identifier (user ID, session ID) that
providers use for deterministic bucketing. Custom attributes carry
additional data (email, plan, region).

Context can be set at three levels: global (via the API object),
client, and per invocation. Lower levels override duplicate keys from
higher levels.

```typescript
// TypeScript - per-invocation context for targeting-rule tests
const ctx = { targetingKey: 'user-42', email: 'user@example.com' };
const details = await client.getBooleanDetails('beta-access', false, ctx);
expect(details.reason).toBe('TARGETING_MATCH');
```

```python
# Python - per-invocation context
from openfeature.evaluation_context import EvaluationContext
ctx = EvaluationContext(targeting_key="user-42",
                        attributes={"email": "user@example.com"})
details = client.get_boolean_details("beta-access", False, ctx)
```

```java
// Java - per-invocation context
Map<String, Value> attrs = new HashMap<>();
attrs.put("email", new Value("user@example.com"));
EvaluationContext ctx = new ImmutableContext("user-42", attrs);
boolean value = client.getBooleanValue("beta-access", false, ctx);
```

## Hooks for test-time side-effects

Hooks intercept the flag evaluation lifecycle. Per
[openfeature.dev/docs/reference/concepts/hooks](https://openfeature.dev/docs/reference/concepts/hooks)
and the specification
([openfeature.dev/specification/sections/hooks](https://openfeature.dev/specification/sections/hooks),
Requirement 4.3.1-4.3.8), the four stages are:

| Stage | Runs when |
|---|---|
| `before` | Before flag resolution; can modify evaluation context |
| `after` | After successful resolution; can validate the returned value |
| `error` | On resolution failure or unhandled before-hook error |
| `finally` | Unconditionally after all other stages |

Execution order for `before`: API - Client - Invocation. For `after`,
`error`, `finally`: reverse order (Invocation - Client - API), per
specification Requirement 4.4.2.

Register hooks at global, client, or invocation level:

```typescript
// Global hook - runs for every flag evaluation
OpenFeature.addHooks({
  before(ctx) {
    // ctx carries flagKey, flagValueType, defaultValue, evaluationContext
    console.log(`Evaluating ${ctx.flagKey}`);
  },
  after(ctx, details) {
    // details is the EvaluationDetails for this evaluation
    expect(details.errorCode).toBeUndefined();
  },
  error(ctx, err) {
    console.error(`Flag ${ctx.flagKey} failed: ${err.message}`);
  },
});
```

Test use case: attach an `after` hook to assert that no evaluation
returns an error code, surfacing `FLAG_NOT_FOUND` regressions across
the entire test run without asserting each flag individually.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Registering a real (networked) provider in unit tests | Network calls; non-deterministic; slow | `InMemoryProvider` for unit tests |
| Evaluating without `setProviderAndWait` / `await setProvider` | Returns default with `PROVIDER_NOT_READY` error code before init | Always await provider readiness |
| Sharing a single `InMemoryProvider` instance across test files | Cross-test state pollution | Create a fresh provider per describe block |
| Asserting only `value`; ignoring `reason` and `errorCode` | Hides fallback-to-default failures (flag absent, type mismatch) | Assert `details.reason` and `details.errorCode` explicitly |
| Testing provider internals (variant weighting, targeting logic) | That is the provider's responsibility, not the application's | Test what the application does with the evaluated value |
| Omitting `OpenFeature.close()` in teardown | Leaks provider state and background threads | Always call `close()` / `shutdown()` in `afterAll` |

## Limitations

- `InMemoryProvider` does not replicate production targeting rules.
  To test that a real provider evaluates a segment correctly, write an
  integration test against that provider's native test harness. Consult
  the sibling skills (`launchdarkly-testing`, `unleash-testing`, etc.)
  for those patterns.
- Client-side OpenFeature SDKs (`@openfeature/web-sdk`) use a
  different `setContext` pattern; this skill targets server-side SDKs.
- Hook `before` stages can modify the evaluation context in some SDK
  versions but the specification marks this as optional behavior - verify
  against your SDK version.
- `InMemoryProvider` does not fire PROVIDER_CHANGED events on `putIfAbsent`
  in all SDK versions; check release notes when relying on event-driven
  updates in tests.

## References

- Evaluation API concept:
  [openfeature.dev/docs/reference/concepts/evaluation-api](https://openfeature.dev/docs/reference/concepts/evaluation-api)
- Provider concept and `setProvider`:
  [openfeature.dev/docs/reference/concepts/provider](https://openfeature.dev/docs/reference/concepts/provider)
- Evaluation context:
  [openfeature.dev/docs/reference/concepts/evaluation-context](https://openfeature.dev/docs/reference/concepts/evaluation-context)
- Hooks concept:
  [openfeature.dev/docs/reference/concepts/hooks](https://openfeature.dev/docs/reference/concepts/hooks)
- OpenFeature specification (flag evaluation):
  [openfeature.dev/specification/sections/flag-evaluation](https://openfeature.dev/specification/sections/flag-evaluation)
- OpenFeature specification (providers):
  [openfeature.dev/specification/sections/providers](https://openfeature.dev/specification/sections/providers)
- OpenFeature specification (hooks):
  [openfeature.dev/specification/sections/hooks](https://openfeature.dev/specification/sections/hooks)
- TypeScript/Node SDK:
  [github.com/open-feature/js-sdk](https://github.com/open-feature/js-sdk/blob/main/packages/server/README.md)
- Java SDK:
  [github.com/open-feature/java-sdk](https://github.com/open-feature/java-sdk/blob/main/README.md)
- Python SDK:
  [github.com/open-feature/python-sdk](https://github.com/open-feature/python-sdk/blob/main/README.md)
- Companion catalogs:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md),
  [`flag-state-coverage-builder`](../flag-state-coverage-builder/SKILL.md)
- Vendor-specific skills:
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md)
- Cross-plugin:
  [`qa-test-environment/feature-flag-test-harness`](../../../qa-test-environment/skills/feature-flag-test-harness/SKILL.md),
  [`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md)
