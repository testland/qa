---
name: unleash-testing
description: "Wraps Unleash (Open Source / SaaS) SDK testing patterns: bootstrap with a static toggles array (no network), the test mode (disableMetrics + disablePolling), the custom strategy testing pattern (implement a Strategy class + assert isEnabled), and assignment-integrity tests. Use when writing tests for code that uses Unleash for feature flags. Composes feature-flag-test-matrix-reference."
rating: 21
d6: 4
archetype: S1
---

# unleash-testing

## When to use

- Tests for code that calls `unleash.isEnabled(flagName, context)`.
- Tests for custom Unleash strategies (the extensibility point).
- Assignment-integrity tests per
  [`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md).

## Authoring

### Install

```bash
npm install --save-dev unleash-client
pip install UnleashClient
```

### Bootstrap with toggles (offline)

```typescript
import { initialize } from 'unleash-client';

const unleash = initialize({
  url: 'http://localhost:4242/api/',
  appName: 'test-app',
  disableMetrics: true,        // No metrics upload
  disablePolling: true,        // No background polling
  bootstrap: {
    data: [
      {
        name: 'show-new-ui',
        enabled: true,
        strategies: [
          { name: 'default' },
        ],
      },
    ],
  },
});

// Wait for initialization
await new Promise<void>((resolve) => unleash.once('synchronized', resolve));
```

The `bootstrap.data` array is the SDK's initial flag state;
since polling is disabled, that state persists for the test
session.

### isEnabled tests

```typescript
test('flag enabled', () => {
  expect(unleash.isEnabled('show-new-ui')).toBe(true);
});

test('flag with context', () => {
  expect(unleash.isEnabled('premium-only', { userId: 'u1', properties: { tier: 'premium' } })).toBe(true);
});
```

### Custom strategy

Unleash's extensibility: custom strategies implement an
`isEnabled(parameters, context)` method.

```typescript
import { Strategy } from 'unleash-client';

class TenantStrategy extends Strategy {
  constructor() { super('tenantStrategy'); }
  isEnabled(parameters: any, context: any): boolean {
    const allowedTenants = (parameters.tenants ?? '').split(',');
    return allowedTenants.includes(context.tenantId);
  }
}

const unleash = initialize({
  url: '...',
  appName: 'test',
  strategies: [new TenantStrategy()],
  bootstrap: {
    data: [
      {
        name: 'flag-x',
        enabled: true,
        strategies: [{ name: 'tenantStrategy', parameters: { tenants: 'A,B' } }],
      },
    ],
  },
});

test('strategy allows tenant A', () => {
  expect(unleash.isEnabled('flag-x', { tenantId: 'A' })).toBe(true);
});

test('strategy rejects tenant C', () => {
  expect(unleash.isEnabled('flag-x', { tenantId: 'C' })).toBe(false);
});
```

### Percentage-rollout determinism

```typescript
const unleash = initialize({
  // ...
  bootstrap: {
    data: [
      {
        name: 'gradual-rollout',
        enabled: true,
        strategies: [{ name: 'flexibleRollout', parameters: { rollout: '50', stickiness: 'userId' } }],
      },
    ],
  },
});

test('rollout deterministic per user', () => {
  const r1 = unleash.isEnabled('gradual-rollout', { userId: 'u1' });
  const r2 = unleash.isEnabled('gradual-rollout', { userId: 'u1' });
  expect(r1).toBe(r2);
});
```

### Teardown

```typescript
afterAll(() => unleash.destroy());
```

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  unleash-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
```

Fully offline - no Unleash server URL needed since polling is
disabled.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `disableMetrics: false` in CI | Spurious metrics POSTs | Always `disableMetrics: true` in tests |
| `disablePolling: false` without test-only URL | Network calls; CI flakes | Always disable polling in offline tests |
| `bootstrap.data` is stale | Drift from prod definitions | Pull from Unleash periodically; commit fixture |
| Custom strategies not unit-tested | Logic bugs in the strategy itself | Test the strategy class in isolation too |
| Skipping `synchronized` event wait | Race: isEnabled returns default | Always await synchronized |
| Forgetting `unleash.destroy()` | Goroutine / timer leak | Always destroy in afterAll |
| Tests use real Unleash server | Slow; flaky if server down | Bootstrap mode |

## Limitations

- **Bootstrap is point-in-time.** Drift between fixture + Unleash
  UI is invisible.
- **Custom strategies tested in isolation lose context.** Integration
  test with the full SDK still needed.
- **Metric-side tests need real server.** If you're testing the
  metrics export path, bootstrap mode is wrong.
- **Stickiness is parameter-driven.** A misconfigured `stickiness`
  parameter shows up in production, not in tests.

## References

- Unleash docs:
  [docs.getunleash.io](https://docs.getunleash.io/).
- Node SDK:
  [docs.getunleash.io/sdks/node-sdk](https://docs.getunleash.io/reference/sdks/node-sdk).
- Custom strategies:
  [docs.getunleash.io/reference/custom-activation-strategies](https://docs.getunleash.io/reference/custom-activation-strategies).
- Companion:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md).
- Sibling SDKs:
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md).
