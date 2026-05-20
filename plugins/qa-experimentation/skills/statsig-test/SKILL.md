---
name: statsig-test
description: "Wraps Statsig SDK testing patterns: server-side initialization (statsig.initialize with API key), gate / experiment / dynamic-config evaluation (checkGate, getExperiment, getConfig), local-evaluation mode for offline tests, override patterns for forcing a specific user into a specific arm (statsig.overrideGate, overrideConfig), and assignment-integrity tests. Use when writing tests for Statsig-instrumented application code. Composes guardrail-metrics-reference + peeking-problem-reference + ab-test-validity-checklist."
rating: 22
d6: 4
archetype: S1
---

# statsig-test

## Overview

Statsig is a unified feature-flag + experimentation platform.
Per [docs.statsig.com](https://docs.statsig.com/), the SDK is
available for Node.js, Java, Python, Go, Ruby, .NET, PHP, Rust,
and C++ — all with the same conceptual surface: gates,
experiments, dynamic configs.

This skill wraps testing patterns for code that uses Statsig.

## When to use

- Tests for code that reads a Statsig gate / experiment.
- Verifying assignment integrity per
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
  Step 3.
- Local-evaluation tests when network access is restricted.

## Authoring

### Install

```bash
npm install --save-dev statsig-node       # Node
pip install statsig                        # Python
```

### Initialize for testing

```typescript
import statsig from 'statsig-node';

beforeAll(async () => {
  await statsig.initialize(process.env.STATSIG_SERVER_KEY!, {
    localMode: true,    // No network; all gates / configs return defaults
  });
});

afterAll(async () => {
  await statsig.shutdown();
});
```

`localMode: true` is the **test-mode flag** — gates fall back to
the default value, configs return empty, no network calls.

### Override gates / experiments per user

```typescript
test('user in treatment sees new UI', async () => {
  statsig.overrideGate('new_ui_gate', true, 'user-1');

  const enabled = await statsig.checkGate({ userID: 'user-1' }, 'new_ui_gate');
  expect(enabled).toBe(true);

  const disabledForOthers = await statsig.checkGate({ userID: 'user-2' }, 'new_ui_gate');
  expect(disabledForOthers).toBe(false);
});
```

`statsig.overrideGate(gateName, value, userID)` — pin a user to
a value for the lifetime of the test.

### Experiment evaluation

```typescript
test('user in arm B sees increased font size', async () => {
  statsig.overrideConfig('font_size_experiment', { font_size: 20 }, 'user-1');

  const exp = await statsig.getExperiment({ userID: 'user-1' }, 'font_size_experiment');
  expect(exp.value).toEqual({ font_size: 20 });
});
```

### Assignment integrity tests

Per [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
Step 3:

```typescript
test('same user always gets same arm (determinism)', async () => {
  const arm1 = await statsig.getExperiment({ userID: 'user-1' }, 'exp-x');
  const arm2 = await statsig.getExperiment({ userID: 'user-1' }, 'exp-x');
  expect(arm1.value).toEqual(arm2.value);
});

test('different users may get different arms', async () => {
  const arms = await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      statsig.getExperiment({ userID: `user-${i}` }, 'exp-x').then(e => e.value)
    )
  );
  const uniqueArms = new Set(arms.map(a => JSON.stringify(a)));
  expect(uniqueArms.size).toBeGreaterThan(1);
});
```

### Exposure event firing

Statsig fires an `exposure` event per evaluation by default;
verify in tests:

```typescript
test('exposure logged on evaluation', async () => {
  const events: any[] = [];
  // Statsig SDK exposes a hook for testing event logging
  statsig.flush();  // Force flush any pending events
  // Inspect via test mock of the event-uploader
});
```

## Running

```bash
npm test
```

For CI, use `STATSIG_SERVER_KEY` set to a test-tier key OR rely
on `localMode: true` for fully-offline tests.

## CI integration

```yaml
jobs:
  statsig-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
        env:
          STATSIG_SERVER_KEY: ${{ secrets.STATSIG_TEST_KEY }}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests using production Statsig API key | Production traffic polluted | Per-env keys; or `localMode: true` |
| Skipping `statsig.shutdown()` | Pending event upload leaks | Always shutdown |
| Asserting on exact internal config IDs | Statsig config IDs change | Assert on returned values |
| Tests rely on real evaluation (no override) | Flaky if Statsig service changes | Override per test |
| Forgetting `userID` in evaluation | Returns default; not the test you wrote | Always pass full user object |
| Sharing one Statsig instance across test files | Override leaks | Per-test cleanup |

## Limitations

- **localMode is most-but-not-fully-offline.** Some SDK
  initialization paths still ping Statsig.
- **No deterministic arm assignment without override.** Test
  randomness via override; for hash-stability use the
  network-mode SDK.
- **Overrides are SDK-instance scoped.** Don't help if the app
  spawns multiple processes.
- **Doesn't validate Statsig's server-side analysis.** That's
  the platform's responsibility; tests verify your code's
  interaction with the SDK.

## References

- Statsig docs:
  [docs.statsig.com/](https://docs.statsig.com/).
- Statsig SDK reference (per language):
  [docs.statsig.com/server-core/](https://docs.statsig.com/server-core/).
- Companion catalogs:
  [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md),
  [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md),
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md).
- Sibling SDKs:
  [`optimizely-test`](../optimizely-test/SKILL.md),
  [`vwo-test`](../vwo-test/SKILL.md),
  [`amplitude-experiment-test`](../amplitude-experiment-test/SKILL.md).
- Detector:
  [`sample-ratio-mismatch-detector`](../../agents/sample-ratio-mismatch-detector.md).
