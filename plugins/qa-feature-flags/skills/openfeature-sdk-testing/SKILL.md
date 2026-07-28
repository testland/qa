---
name: openfeature-sdk-testing
description: "Wraps OpenFeature (CNCF vendor-neutral SDK abstraction) testing patterns: the InMemoryProvider for hermetic tests without network calls, provider registration via OpenFeature.setProvider, the getBooleanValue/getBooleanDetails evaluation API with EvaluationDetails (value, variant, reason, errorCode), hooks for evaluation side-effects, and evaluation context for targeting-rule tests. Covers TypeScript, Java, and Python SDKs. Use when writing tests for code that resolves feature flags through the OpenFeature SDK regardless of the underlying flag management platform."
metadata:
  keywords: "openfeature, feature-flags, cncf, hermetic-tests, in-memory-provider"
---

# openfeature-sdk-testing

## Overview

The OpenFeature SDK ships an `InMemoryProvider` in every language that
substitutes real flag-management infrastructure with in-process flag
state, letting unit and integration tests run without any network call.
The production evaluation path (targeting logic, type coercion,
defaults) is exercised in full; only the data source is swapped. Per
[openfeature.dev/docs/reference/concepts/provider](https://openfeature.dev/docs/reference/concepts/provider),
"an application integrator can register one provider at a time."

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
- Assignment-integrity tests per `ab-test-validity-checklist`.

## How to use

TypeScript/Node.js is the canonical language below. The Java and Python
flow is identical; only the API names differ, listed in
[references/multi-language-and-spec.md](references/multi-language-and-spec.md).

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

Java and Python install/configure/evaluate blocks live in
[references/multi-language-and-spec.md](references/multi-language-and-spec.md).

## EvaluationDetails and reason codes

`EvaluationDetails` carries `value`, `flagKey`, `variant`, `reason`,
`errorCode`, `errorMessage`, and `flagMetadata`. Canonical `reason`
values include `STATIC`, `DEFAULT`, `TARGETING_MATCH`, `SPLIT`,
`CACHED`, `DISABLED`, `UNKNOWN`, `STALE`, `ERROR`; canonical error
codes include `FLAG_NOT_FOUND`, `TYPE_MISMATCH`,
`TARGETING_KEY_MISSING`, and `PROVIDER_NOT_READY`. The full field
table with spec requirement numbers is in
[references/multi-language-and-spec.md](references/multi-language-and-spec.md).

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

Java and Python context builders (`ImmutableContext`,
`EvaluationContext`) are in
[references/multi-language-and-spec.md](references/multi-language-and-spec.md).

## Hooks for test-time side-effects

Hooks intercept the flag evaluation lifecycle at four stages -
`before` (can modify evaluation context), `after` (validate the
returned value), `error` (on resolution failure), and `finally`
(unconditionally). The stage table and execution order (per
specification Requirement 4.4.2) are in
[references/multi-language-and-spec.md](references/multi-language-and-spec.md).

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
- Java / Python SDK code and spec tables:
  [references/multi-language-and-spec.md](references/multi-language-and-spec.md)
- Companion catalogs:
  `feature-flag-test-matrix-reference`,
  `flag-state-coverage-builder`
- Vendor-specific skills:
  `launchdarkly-testing`,
  `unleash-testing`,
  `flagsmith-testing`,
  `growthbook-testing`
- Cross-plugin:
  `feature-flag-test-harness`,
  `ab-test-validity-checklist`
