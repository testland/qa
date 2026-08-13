# Kill-switch (ops-toggle) test authoring

The four test categories specific to kill-switch flags: switch-OFF graceful
degradation, fail-static default when the flag service is unreachable,
latency budget for the kill decision, and no-data-corruption mid-flight.

A kill-switch flag (also called an ops toggle) is a long-lived feature flag
whose purpose is to let operators immediately disable functionality in
production during an incident, per Martin Fowler's feature-toggle taxonomy at
[martinfowler.com/articles/feature-toggles.html](https://martinfowler.com/articles/feature-toggles.html).
Fowler identifies them as "manually-managed circuit breakers" that must be
reconfigurable without a deployment.

Kill-switch flags share the same SDK infrastructure as other flags but carry
distinct testing obligations because they are incident-response tools, not
just delivery mechanisms.

Author these when: a new kill-switch flag is introduced (naming signals:
`disable-*`, `emergency-*`, `*-kill`, `circuit-*`, `shutdown-*`); a
production incident exposed that a kill-switch was flipped but the feature
did not degrade cleanly; a high-traffic launch pre-positions kill-switches;
or a PR touches a kill-switch-gated code path.

## Category 1 - Switch-OFF path degrades gracefully

The feature code must handle the `off` variant without throwing, panicking,
or producing a broken UI state.

```typescript
// LaunchDarkly TestData source - from launchdarkly.com/docs/sdk/features/test-data-sources:
// "The test data source allows you to mock the behavior of a LaunchDarkly
//  SDK so it has predictable behavior when evaluating flags."
import { TestData } from '@launchdarkly/node-server-sdk';

describe('checkout-kill-switch: switch-OFF', () => {
  let td: TestData;

  beforeEach(() => {
    td = TestData.dataSource();
    // Flag starts ON (normal production state)
    td.update(td.flag('checkout-kill').boolVariation(true));
  });

  test('flag OFF - checkout shows maintenance message, not an error', async () => {
    td.update(td.flag('checkout-kill').boolVariation(false));
    const result = await renderCheckout({ flagClient: clientWith(td) });
    expect(result.status).toBe('degraded');
    expect(result.userMessage).toMatch(/temporarily unavailable/i);
    expect(result.errorThrown).toBe(false);
  });

  test('flag OFF - degraded path does not call payment provider', async () => {
    td.update(td.flag('checkout-kill').boolVariation(false));
    const paymentSpy = jest.spyOn(paymentProvider, 'charge');
    await renderCheckout({ flagClient: clientWith(td) });
    expect(paymentSpy).not.toHaveBeenCalled();
  });
});
```

Document what the degraded state must and must not do; include it as a code
comment or test description so the test doubles as operational runbook.

## Category 2 - Fail-static default when the flag service is unreachable

Per the OpenFeature specification at
[openfeature.dev/docs/reference/concepts/evaluation-api](https://openfeature.dev/docs/reference/concepts/evaluation-api):
"In the case of any error during flag evaluation, the default value will be
returned, so give consideration to your default values!"

The LaunchDarkly SDK aligns: "The fallback value is defined in your code...
and is only returned if an error occurs" including "LaunchDarkly service is
unreachable" (source: [launchdarkly.com/docs/sdk/features/evaluating](https://launchdarkly.com/docs/sdk/features/evaluating)).

The test must assert two things: the SDK returns the correct default, and the
application continues operating with that default rather than throwing.

```typescript
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

describe('checkout-kill-switch: fail-static default', () => {
  test('provider unavailable - default OFF is served, app does not crash', async () => {
    // Register a provider that always throws
    await OpenFeature.setProviderAndWait(new AlwaysErrorProvider());
    const client = OpenFeature.getClient();

    // Default is false (feature disabled) - the safe side for a kill-switch
    const value = await client.getBooleanValue('checkout-kill', false);
    expect(value).toBe(false);

    // Application layer must handle the default without throwing
    await expect(renderCheckout({ featureEnabled: value })).resolves.not.toThrow();
  });

  test('provider unavailable - error hook fires and is logged', async () => {
    const errorEvents: string[] = [];
    OpenFeature.addHooks({
      error: (_ctx, err) => { errorEvents.push(err.message); }
    });
    await OpenFeature.setProviderAndWait(new AlwaysErrorProvider());
    const client = OpenFeature.getClient();
    await client.getBooleanValue('checkout-kill', false);
    expect(errorEvents.length).toBeGreaterThan(0);
  });
});
```

The default value for a kill-switch MUST be the safe side: `false` for a
flag that enables a feature (disable it on error) or `true` for a flag that
disables a feature (keep it disabled on error). Document the chosen default
and its rationale as a comment at the flag call site.

## Category 3 - Latency budget for the kill decision

A kill-switch flipped in the operator console must reach running processes
within an acceptable window. The window depends on the streaming/polling
configuration of the SDK.

Per LaunchDarkly's documentation at
[launchdarkly.com/docs/sdk/concepts/client-side-server-side](https://launchdarkly.com/docs/sdk/concepts/client-side-server-side):
"Server-side SDKs open a streaming connection to LaunchDarkly and receive
flag configuration changes over the stream." The cached values have "no
expiration or time-to-live (TTL) value" - propagation speed depends on the
streaming connection, not a TTL. Client-side SDKs that use polling have an
interval-bound lag.

Because in-process latency tests against a live SDK are environment-dependent
and slow, the recommended approach is two tests:

1. A unit test that asserts the flag-evaluation result changes synchronously
   when the in-memory test source is updated (validates that the application
   re-reads the flag on each request rather than caching it locally).
2. An integration test comment documenting the expected propagation window
   for your SDK configuration, to be verified in a staging smoke test.

```typescript
describe('checkout-kill-switch: kill latency', () => {
  test('flag re-evaluated per request - not cached application-side', async () => {
    const td = TestData.dataSource();
    td.update(td.flag('checkout-kill').boolVariation(true));
    const client = clientWith(td);

    const before = await isCheckoutEnabled(client);
    expect(before).toBe(true);

    // Flip the kill-switch
    td.update(td.flag('checkout-kill').boolVariation(false));

    // Next evaluation reflects the flip without a process restart
    const after = await isCheckoutEnabled(client);
    expect(after).toBe(false);
  });

  // Integration note: with LaunchDarkly streaming (server SDK default),
  // flag changes propagate in near-real-time over the SSE stream.
  // With Unleash polling (default 15s interval per unleash.io/docs),
  // the worst-case lag equals the polling interval.
  // Agree on the acceptable window with SRE and add a staging smoke test.
});
```

If the application caches the flag value (e.g., in a request-scoped
singleton), this test will catch it.

## Category 4 - No data corruption mid-flight

When the kill-switch flips while an operation is already in progress (a
multi-step transaction, a streaming response, a batch job), the in-progress
operation must complete cleanly or roll back - it must not leave partial
state.

This is the most scenario-specific of the four categories. The general
pattern is to snapshot the flag value at the start of the operation and hold
it for the operation's duration rather than re-evaluating mid-operation.

```typescript
describe('checkout-kill-switch: mid-flight flip', () => {
  test('in-progress order is not corrupted when kill-switch flips mid-checkout', async () => {
    const td = TestData.dataSource();
    td.update(td.flag('checkout-kill').boolVariation(true));
    const client = clientWith(td);

    // Begin a multi-step checkout; flip the flag after step 1
    const order = await startCheckout(client);  // Step 1: reserve inventory

    // Simulate operator flipping the kill-switch during step 2
    td.update(td.flag('checkout-kill').boolVariation(false));

    const result = await completeCheckout(order);  // Step 2: charge + confirm

    // Either fully committed or fully rolled back - never partial
    expect(['committed', 'rolled_back']).toContain(result.state);
    if (result.state === 'rolled_back') {
      // Inventory reservation must be released
      expect(await inventoryReserved(order.itemId)).toBe(false);
    }
  });
});
```

Document the consistency contract in a test description or comment: what
"no partial state" means for this specific operation.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only the ON path | OFF path is untested; incident reveals broken degradation | Category 1 test |
| Default value is ON (feature enabled) | SDK failure enables a feature that should be disabled | Default must be the safe-off side |
| Application caches the flag value | Kill-switch flip takes minutes not seconds | Re-evaluate per request; Category 3 test catches it |
| Mid-flight test omitted | Flip during a transaction causes partial writes | Category 4 test for any stateful operation |
| Rely on live SDK in unit tests | Flaky; requires network | Use TestData (LD) or InMemory provider (OpenFeature) |
| No error-hook assertion | Unreachable SDK is silent; ops loses visibility | Assert error hook fires in Category 2 test |

## Limitations

- **Category 3 (latency) cannot be fully tested without a real SDK connection.**
  The unit test verifies application-side re-evaluation; the propagation
  window (streaming lag or poll interval) requires a staging integration test.
- **Mid-flight semantics are application-specific.** Category 4 must be
  authored per operation; no generic skeleton fits all cases.
- **Multi-process deployments.** Each server process holds an independent SDK
  connection. The kill propagates to each independently; the worst-case
  latency is per-process.

## Sources

- Kill-switch / ops-toggle definition and taxonomy: Pete Hodgson,
  "Feature Toggles (aka Feature Flags)":
  [martinfowler.com/articles/feature-toggles.html](https://martinfowler.com/articles/feature-toggles.html).
- Fail-static default value behavior (OpenFeature):
  [openfeature.dev/docs/reference/concepts/evaluation-api](https://openfeature.dev/docs/reference/concepts/evaluation-api).
- Fallback values on SDK error or service unreachability (LaunchDarkly):
  [launchdarkly.com/docs/sdk/features/evaluating](https://launchdarkly.com/docs/sdk/features/evaluating).
- LaunchDarkly TestData mock source for SDK-level tests:
  [launchdarkly.com/docs/sdk/features/test-data-sources](https://launchdarkly.com/docs/sdk/features/test-data-sources).
- Streaming vs polling propagation speed and in-memory cache behavior (LaunchDarkly):
  [launchdarkly.com/docs/sdk/concepts/client-side-server-side](https://launchdarkly.com/docs/sdk/concepts/client-side-server-side).
- Circuit breaker as automated kill-switch pattern: Martin Fowler, "CircuitBreaker":
  [martinfowler.com/bliki/CircuitBreaker.html](https://martinfowler.com/bliki/CircuitBreaker.html).
