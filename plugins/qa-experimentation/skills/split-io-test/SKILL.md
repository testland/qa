---
name: split-io-test
description: "Wraps Split.io (Harness FME) SDK testing patterns: hermetic localhost/offline mode with an in-memory features map (JavaScript/browser) or a YAML fixture file (Node.js server-side), getTreatment and getTreatmentWithConfig evaluation, the SDK_READY event and whenReady() promise, impression listener verification, sync.impressionsMode configuration, and CI setup. Use when writing tests for application code instrumented with the Split.io or Harness Feature Management & Experimentation SDK."
---

# split-io-test

## Overview

Split.io is now part of the Harness platform as Harness Feature
Management & Experimentation (FME). The SDK retains the Split
surface: `SplitFactory`, `getTreatment`, `getTreatmentWithConfig`,
and the event system. Both the JavaScript (browser) and Node.js
(server-side) SDKs support a **localhost/offline mode** that
eliminates all network calls during tests, making feature-flag
evaluation fully hermetic.

This skill covers the Node.js server-side SDK and the JavaScript
client SDK. All SDK behavior cited below is drawn from
[developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/server-side-sdks/nodejs-sdk](https://developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/server-side-sdks/nodejs-sdk)
and
[developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/client-side-sdks/javascript-sdk](https://developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/client-side-sdks/javascript-sdk).

**Differentiation from sibling SDK skills:** `statsig-test` uses
`localMode: true` (gate/config primitives); `optimizely-test` uses
a JSON datafile; `amplitude-experiment-test` uses a local-eval
JSON fixture. This skill is distinct: Split.io's offline mechanism
uses `authorizationKey: 'localhost'` paired with an in-memory
`features` map (JS SDK) or a YAML/text fixture file (Node.js SDK),
and its evaluation API is `getTreatment` / `getTreatmentWithConfig`
rather than `decide`, `variant`, or `checkGate`.

## When to use

- Tests for code that calls `client.getTreatment()` or
  `client.getTreatmentWithConfig()` against a Split.io-instrumented
  surface.
- Verifying that impression listeners fire correctly per SDK
  evaluation.
- Assignment-integrity tests per
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
  Step 3.
- CI pipelines where network access to Split.io / Harness is
  unavailable or undesirable.

## How to use

### Install

```bash
npm install --save-dev @splitsoftware/splitio   # Node.js + browser
```

### Localhost/offline mode - JavaScript (browser) SDK

Per the JavaScript SDK docs at
[developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/client-side-sdks/javascript-sdk](https://developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/client-side-sdks/javascript-sdk),
set `authorizationKey` to `'localhost'` and supply a `features` map:

```typescript
import { SplitFactory } from '@splitsoftware/splitio';

const factory = SplitFactory({
  core: {
    authorizationKey: 'localhost',
    key: 'test-user-1',
  },
  features: {
    'checkout_redesign':  'on',
    'dark_mode':          'off',
    'pricing_experiment': { treatment: 'v2', config: '{"price":9}' },
  },
  scheduler: {
    offlineRefreshRate: 15,   // seconds between simulated polls
  },
});
const client = factory.client();
```

Any flag absent from the `features` map returns the `'control'`
treatment automatically - no extra setup needed for flags the
test does not care about.

### Localhost/offline mode - Node.js (server-side) SDK

Per the Node.js SDK docs at
[developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/server-side-sdks/nodejs-sdk](https://developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/server-side-sdks/nodejs-sdk),
the server-side SDK reads offline fixtures from a file path. Use
a YAML fixture (supported since SDK v10.7.0) for per-key targeting:

```yaml
# tests/fixtures/split-flags.yml
- checkout_redesign:
    treatment: "on"
    keys: "test-user-1"
    config: "{}"
- checkout_redesign:
    treatment: "off"
- dark_mode:
    treatment: "off"
```

```typescript
import path from 'path';
import { SplitFactory } from '@splitsoftware/splitio';

const factory = SplitFactory({
  core: { authorizationKey: 'localhost' },
  features: path.join(__dirname, 'fixtures/split-flags.yml'),
  scheduler: { offlineRefreshRate: 15 },
});
const client = factory.client('test-user-1');
```

The plain-text format (two whitespace-separated columns) is also
supported for simpler cases where per-key targeting is not needed.

### SDK_READY event and whenReady()

The SDK emits `client.Event.SDK_READY` when its data is loaded.
Per the JavaScript SDK docs, always wait for this event before
evaluating treatments to avoid receiving `'control'` prematurely:

```typescript
// Event-listener style
client.on(client.Event.SDK_READY, () => {
  const treatment = client.getTreatment('checkout_redesign');
  expect(treatment).toBe('on');
});
```

Or use the promise-based equivalent (cleaner in async test bodies):

```typescript
// Promise style
beforeAll(async () => {
  await client.whenReady();
});
```

Additional events per the docs:
- `SDK_READY_TIMED_OUT`: timeout before data loaded; SDK may still
  become ready later
- `SDK_UPDATE`: rollout plan changed (useful in localhost mode to
  test dynamic flag flips)

### getTreatment and getTreatmentWithConfig

Per the Node.js SDK docs, `getTreatment` returns a treatment string;
`getTreatmentWithConfig` returns `{ treatment: string, config: string | null }`:

```typescript
test('user in treatment arm sees new pricing', async () => {
  await client.whenReady();

  const treatment = client.getTreatment('test-user-1', 'pricing_experiment');
  expect(treatment).toBe('v2');

  const result = client.getTreatmentWithConfig(
    'test-user-1',
    'pricing_experiment'
  );
  expect(result.treatment).toBe('v2');
  expect(JSON.parse(result.config!)).toEqual({ price: 9 });
});

test('unknown flag returns control', async () => {
  await client.whenReady();
  const treatment = client.getTreatment('test-user-1', 'nonexistent_flag');
  expect(treatment).toBe('control');
});
```

Note: the Node.js SDK's `getTreatment` takes `(key, flagName, attributes?, evaluationOptions?)`.
The JavaScript client SDK's `getTreatment` takes `(flagName, attributes?)` because
the key is bound at `factory.client(key)` construction time.

### Impression listener verification

Per the Node.js SDK docs, attach an `impressionListener` to
`SplitFactory` options. The `logImpression` callback receives an
object containing `impression` (feature flag, key, treatment, label),
`attributes`, `ip`, `hostname`, and `sdkLanguageVersion`:

```typescript
const impressions: any[] = [];

const factory = SplitFactory({
  core: { authorizationKey: 'localhost' },
  features: path.join(__dirname, 'fixtures/split-flags.yml'),
  impressionListener: {
    logImpression(data) {
      impressions.push(data);
    },
  },
});
const client = factory.client('test-user-1');

test('impression fires on getTreatment', async () => {
  impressions.length = 0;
  await client.whenReady();

  client.getTreatment('test-user-1', 'checkout_redesign');

  expect(impressions).toHaveLength(1);
  expect(impressions[0].impression.treatment).toBe('on');
});
```

### Controlling impression mode

Per the Node.js SDK docs, `sync.impressionsMode` has three values:

- `'OPTIMIZED'` (default): only unique impressions queued; reduces
  traffic; suitable for production and most test scenarios.
- `'DEBUG'`: all impressions queued and sent; use when validating
  that every evaluation generates a record.
- `'NONE'`: no impressions tracked; use for flag-only (non-experiment)
  use cases in CI where impression noise is unwanted.

```typescript
const factory = SplitFactory({
  core: { authorizationKey: 'localhost' },
  features: path.join(__dirname, 'fixtures/split-flags.yml'),
  sync: { impressionsMode: 'DEBUG' },
});
```

### Assignment integrity tests

Per [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
Step 3, verify that the same key always receives the same treatment
and that different keys can receive different treatments:

```typescript
test('same key always gets same treatment (determinism)', async () => {
  await client.whenReady();
  const t1 = client.getTreatment('test-user-1', 'checkout_redesign');
  const t2 = client.getTreatment('test-user-1', 'checkout_redesign');
  expect(t1).toBe(t2);
});

test('treatments match the features map (hermetic)', async () => {
  await client.whenReady();
  expect(client.getTreatment('test-user-1', 'checkout_redesign')).toBe('on');
  // Different key receives the default treatment (no per-key override)
  expect(client.getTreatment('test-user-2', 'checkout_redesign')).toBe('off');
});
```

### Teardown

Per the Node.js SDK docs, call `client.destroy()` (returns a
promise) after tests to release internal resources. Skipping it
leaks event-listener handles and impression flush timers:

```typescript
afterAll(async () => {
  await client.destroy();
});
```

After `destroy()` is called, subsequent `getTreatment` calls return
`'control'` and factory operations require re-instantiation.

### CI integration

```yaml
jobs:
  split-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
        # No SPLIT_API_KEY needed: localhost mode is fully offline
```

The YAML fixture is committed alongside the test code. No
`SPLIT_API_KEY` secret is required in CI when using localhost mode.

## Example

Full end-to-end Node.js test (Jest) for a checkout feature guarded
by two flags:

```typescript
import path from 'path';
import { SplitFactory } from '@splitsoftware/splitio';

let factory: SplitIO.ISDK;
let client: SplitIO.IClient;

beforeAll(async () => {
  factory = SplitFactory({
    core: { authorizationKey: 'localhost' },
    features: path.join(__dirname, '__fixtures__/split-flags.yml'),
    sync: { impressionsMode: 'NONE' },
  });
  client = factory.client('user-123');
  await client.whenReady();
});

afterAll(async () => {
  await client.destroy();
});

describe('checkout page feature flags', () => {
  it('shows redesigned checkout for on-treatment users', () => {
    expect(client.getTreatment('user-123', 'checkout_redesign')).toBe('on');
  });

  it('returns config for pricing experiment arm', () => {
    const result = client.getTreatmentWithConfig('user-123', 'pricing_experiment');
    expect(result.treatment).toBe('v2');
    expect(JSON.parse(result.config!)).toMatchObject({ price: 9 });
  });

  it('returns control for an undeclared flag', () => {
    expect(client.getTreatment('user-123', 'unrelated_flag')).toBe('control');
  });
});
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using a real SDK key in tests | Network calls; production impressions logged | `authorizationKey: 'localhost'` |
| Calling `getTreatment` before `SDK_READY` | Returns `'control'` silently; wrong assertion | `await client.whenReady()` in `beforeAll` |
| Skipping `client.destroy()` | Impression-flush timers leak between test files | Always `await client.destroy()` in `afterAll` |
| Hardcoding the default `.split` file path | Breaks on CI where `$HOME` differs | Pass explicit path via `path.join(__dirname, ...)` |
| Asserting `result.config` is an object | `config` is a JSON string, not a parsed object | `JSON.parse(result.config!)` before asserting |
| Sharing one factory across test files | Flag-map mutations bleed between suites | One factory per test file |
| Using `impressionsMode: 'DEBUG'` in CI | Every evaluation triggers a flush attempt | Use `'NONE'` when impressions are not under test |

## Limitations

- **No arm-pinning override API.** Unlike Statsig's `overrideGate`
  or Optimizely's `setForcedDecision`, the Split.io SDK has no
  per-user override call. Pin treatments by adding a per-key YAML
  entry in the fixture file or by supplying the exact key that
  maps to the desired treatment.
- **Localhost mode is in-process only.** It does not work across
  multiple processes (e.g., a forked worker) unless each process
  initializes its own factory with the same fixture.
- **YAML per-key targeting requires Node.js SDK v10.7.0+.** Earlier
  versions only support the plain-text two-column format with
  uniform treatment per flag.
- **Dynamic feature-map mutations (JS SDK only).** Mutating the
  `features` object at runtime triggers `SDK_UPDATE` and simulates
  a rollout change. The Node.js file-based fixture does not support
  runtime mutation without reloading.
- **Does not validate Split.io's server-side statistical analysis.**
  Platform analysis is the vendor's responsibility; this skill
  tests your code's interaction with the SDK only.

## References

- Node.js SDK docs (Harness FME):
  [developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/server-side-sdks/nodejs-sdk](https://developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/server-side-sdks/nodejs-sdk)
- JavaScript SDK docs (Harness FME):
  [developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/client-side-sdks/javascript-sdk](https://developer.harness.io/docs/feature-management-experimentation/sdks-and-infrastructure/client-side-sdks/javascript-sdk)
- Companion catalogs:
  [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md),
  [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md),
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
- Sibling SDKs:
  [`statsig-test`](../statsig-test/SKILL.md),
  [`optimizely-test`](../optimizely-test/SKILL.md),
  [`vwo-test`](../vwo-test/SKILL.md),
  [`amplitude-experiment-test`](../amplitude-experiment-test/SKILL.md)
