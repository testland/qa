---
name: growthbook-testing
description: "Wraps GrowthBook Node SDK testing patterns: GrowthBookClient initialization with direct payload (initSync; no network), isOn / getFeatureValue / evalFeature, scoped instances (createScopedInstance) for per-request user context, inline experiment (runInlineExperiment) tests, and tracking-callback assertion patterns. Use when writing tests for code using GrowthBook for flags + experiments. Composes feature-flag-test-matrix-reference + qa-experimentation/ab-test-validity-checklist."
---

# growthbook-testing

## Overview

Per
[docs.growthbook.io/lib/node](https://docs.growthbook.io/lib/node),
the GrowthBook Node SDK's `GrowthBookClient` supports an
`initSync({ payload })` pattern that fully bypasses the network - pass the feature definitions directly.

`createScopedInstance` lets each test (or request) bind its own
user context cleanly.

## When to use

- Tests for code using GrowthBook flags or experiments.
- Inline-experiment tests (server-side experiment definitions).
- Tracking-callback assertions to verify exposure events fire.

## Authoring

### Install

```bash
npm install --save-dev @growthbook/growthbook
```

### Initialize with payload (offline)

Per [docs.growthbook.io](https://docs.growthbook.io/lib/node):

```typescript
import { GrowthBookClient } from '@growthbook/growthbook';

const gbClient = new GrowthBookClient().initSync({
  payload: {
    features: {
      'show-new-ui': { defaultValue: true },
      'experiment-x': {
        defaultValue: false,
        rules: [{ condition: { id: 'test-user-1' }, force: true }],
      },
    },
  },
});
```

`initSync` is purpose-built for tests - no async wait.

### isOn / getFeatureValue

```typescript
test('flag on', () => {
  const userContext = { attributes: { id: 'user-1' } };
  expect(gbClient.isOn('show-new-ui', userContext)).toBe(true);
});

test('typed feature value', () => {
  const userContext = { attributes: { id: 'user-1' } };
  const color = gbClient.getFeatureValue('button-color', 'blue', userContext);
  expect(['blue', 'red', 'green']).toContain(color);
});
```

### Scoped instance per test

Per GrowthBook docs:

```typescript
test('user-specific evaluation', () => {
  const instance = gbClient.createScopedInstance({
    attributes: { id: 'user-1', plan: 'premium' },
  });
  expect(instance.isOn('premium-feature')).toBe(true);
});
```

Avoids passing context everywhere.

### Inline experiments

```typescript
test('inline experiment returns one variant', () => {
  const userContext = { attributes: { id: 'user-1' } };
  const { value } = gbClient.runInlineExperiment({
    key: 'my-experiment',
    variations: ['red', 'blue', 'green'],
    coverage: 1.0,
    weights: [0.33, 0.34, 0.33],
  }, userContext);
  expect(['red', 'blue', 'green']).toContain(value);
});
```

### Tracking-callback assertions

```typescript
test('experiment tracking fires', () => {
  const tracked: any[] = [];
  const client = new GrowthBookClient({
    trackingCallback: (exp, result, ctx) => {
      tracked.push({ key: exp.key, variation: result.key });
    },
  }).initSync({ payload: {} });

  client.runInlineExperiment(
    { key: 'exp-x', variations: [0, 1] },
    { attributes: { id: 'user-1' } }
  );

  expect(tracked).toHaveLength(1);
  expect(tracked[0].key).toBe('exp-x');
});
```

### Feature-usage callback

```typescript
const evaluated: any[] = [];

test('feature usage logged', () => {
  const userContext = {
    attributes: { id: 'user-1' },
    onFeatureUsage: (key: string, result: any) => {
      evaluated.push({ key, value: result.value });
    },
  };

  gbClient.evalFeature('feature-x', userContext);
  expect(evaluated).toContainEqual(expect.objectContaining({ key: 'feature-x' }));
});
```

### TypeScript-strict feature contract

```typescript
interface AppFeatures {
  'button-color': string;
  'font-size': number;
  'newForm': boolean;
}

const gbClient = new GrowthBookClient<AppFeatures>({}).initSync({ payload: {} });

const color = gbClient.getFeatureValue('button-color', 'blue', ctx);  // typed
// gbClient.isOn('buton-color', ctx);  // typo → compile error
```

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  growthbook-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
```

Fully offline; no GrowthBook key needed.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Live `apiHost` in tests | Network requests; flaky | `initSync({ payload })` |
| Skipping tracking-callback assertion | Exposure-event regressions silent | Per-test callback + assert |
| Sharing scopedInstance across tests | Cross-test state | Per-test create |
| TypeScript any-typed features | Lose compile-time safety | Generic `AppFeatures` |
| `coverage: 0.1` in test without large N | Not enough samples to see all variations | Use `coverage: 1.0` for deterministic tests |
| Missing user.id in context | Bucketing degenerate | Always pass `attributes.id` |
| Tests assume default `weights` is 50/50 | Default behaviour drifts | Explicit weights |

## Limitations

- **Payload is point-in-time.** Drift from GrowthBook UI
  invisible.
- **No targeting-rule-test helper** beyond writing conditions.
  Complex targeting tests need many fixture variants.
- **Tracking-callback is synchronous.** Async exposure logging
  needs a separate test.
- **TypeScript strict-mode required** for the typed feature
  contract.

## References

- GrowthBook Node SDK:
  [docs.growthbook.io/lib/node](https://docs.growthbook.io/lib/node).
- Inline experiments:
  [docs.growthbook.io/lib/node#inline-experiments](https://docs.growthbook.io/lib/node).
- Companion:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md).
- Cross-plugin (experiment-validity):
  [`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md).
- Sibling SDKs:
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md).
