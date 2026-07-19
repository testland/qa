---
name: launchdarkly-testing
description: "Wraps LaunchDarkly server-side SDK testing patterns: TestData data source for hermetic tests (no network), file-based data source for fixture-driven tests, flag override patterns (TestData.update for per-test flag values), and assignment-integrity tests. Use when writing tests for code that uses LaunchDarkly flags."
---

# launchdarkly-testing

## Overview

LaunchDarkly's server-side SDK exposes a `TestData` data source
that lets tests configure flag values without any network call - 
the canonical hermetic-test pattern. Per
[launchdarkly.com/docs/sdk](https://launchdarkly.com/docs/sdk),
TestData replaces the production data source; everything else
about the SDK (variation evaluation, targeting rules, default
handling) runs the real code paths.

## When to use

- Unit / integration tests for code that calls
  `client.variation()` / `client.boolVariation()`.
- Tests asserting on targeting-rule behaviour (segment matching,
  percentage rollout).
- Assignment-integrity tests per `ab-test-validity-checklist`.

## Authoring

### Install

```bash
npm install --save-dev launchdarkly-node-server-sdk
pip install launchdarkly-server-sdk
```

### Initialize with TestData

```typescript
import * as LaunchDarkly from 'launchdarkly-node-server-sdk';

const td = LaunchDarkly.TestData.dataSource();
const client = LaunchDarkly.init('sdk-test-key', {
  updateProcessor: td,
  sendEvents: false,         // No event uploads in tests
});

await client.waitForInitialization();

// Configure a flag's default + per-user variation
td.update(td.flag('show-new-ui').booleanFlag().on(true));
```

### Variation evaluation

```typescript
test('flag on returns true', async () => {
  td.update(td.flag('show-new-ui').booleanFlag().on(true));
  const user = { key: 'user-1' };
  const enabled = await client.variation('show-new-ui', user, false);
  expect(enabled).toBe(true);
});

test('flag off returns default', async () => {
  td.update(td.flag('show-new-ui').booleanFlag().on(false));
  const enabled = await client.variation('show-new-ui', { key: 'user-1' }, false);
  expect(enabled).toBe(false);
});
```

### Targeting rules

```typescript
test('only premium users get treatment', async () => {
  td.update(
    td.flag('premium-feature')
      .booleanFlag()
      .variationForUser('premium-user-1', true)
      .fallthroughVariation(false)
  );
  expect(await client.variation('premium-feature', { key: 'premium-user-1' }, false)).toBe(true);
  expect(await client.variation('premium-feature', { key: 'free-user-1' }, false)).toBe(false);
});
```

### Percentage rollout (deterministic assignment)

```typescript
test('rollout is deterministic per user', async () => {
  td.update(td.flag('half-rollout').booleanFlag().on(true).variations(true, false));
  // Bucketing is deterministic on user key
  const r1 = await client.variation('half-rollout', { key: 'user-1' }, false);
  const r2 = await client.variation('half-rollout', { key: 'user-1' }, false);
  expect(r1).toBe(r2);
});
```

### File-based data source (alternative)

For fixture-shared tests:

```typescript
const fileSource = LaunchDarkly.FileDataSource({
  paths: ['./tests/fixtures/ld-flags.json'],
});
const client = LaunchDarkly.init('sdk-test-key', {
  updateProcessor: fileSource,
  sendEvents: false,
});
```

The JSON file uses LaunchDarkly's flag-snapshot format. Useful
for cross-language test fixtures.

### Teardown

```typescript
afterAll(async () => {
  await client.close();
});
```

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  ld-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
```

No `LAUNCHDARKLY_SDK_KEY` needed in CI - TestData/file source
replaces it.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Real SDK key in tests | Test traffic pollutes prod analytics | TestData / FileDataSource |
| `sendEvents: true` in tests | Event upload from CI | `sendEvents: false` |
| Multiple init per test | Slow init; leaks | One global client; TestData.update per test |
| Asserting exact variation result without `td.update` | Race vs SDK state | Always `update` first |
| Forgetting `await client.waitForInitialization()` | Race; variation returns default | Always wait |
| Sharing `td` across test files | Cross-test pollution | Per-file or per-test TestData |
| No teardown `client.close()` | Network handles leak | Always close in afterAll |

## Limitations

- **TestData is server-side-SDK-specific.** Client-side SDKs
  have their own offline modes.
- **Doesn't validate LaunchDarkly's UI-side rollout math.**
  Platform-side bucketing is separately tested.
- **No experiment-results validation.** That's
  `feature-flag-experiment-validator` (in the qa-shift-right plugin).
- **`FileDataSource` schema is LaunchDarkly-internal.** Refer
  to LD docs for the format.

## References

- LaunchDarkly SDK docs:
  [launchdarkly.com/docs/sdk](https://launchdarkly.com/docs/sdk).
- TestData data source guide:
  [launchdarkly.com/docs/sdk/features/test-data-sources](https://launchdarkly.com/docs/sdk/features/test-data-sources).
- File-based data source:
  [launchdarkly.com/docs/sdk/features/flags-from-files](https://launchdarkly.com/docs/sdk/features/flags-from-files).
- Companion catalogs:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md).
- Sibling SDKs:
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md).
- Cross-plugin:
  `feature-flag-test-harness`,
  `ab-test-validity-checklist`.
