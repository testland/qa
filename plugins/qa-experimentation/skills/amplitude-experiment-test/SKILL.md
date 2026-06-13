---
name: amplitude-experiment-test
description: "Wraps Amplitude Experiment SDK testing patterns: client initialization with API key (or a bootstrapped local flag config for offline tests), the fetch / variant API, exposure-event suppression in tests, and assignment-integrity tests. Use when writing tests for code that uses Amplitude Experiment for A/B testing or flag management. Composes guardrail-metrics-reference + peeking-problem-reference + ab-test-validity-checklist."
rating: 21
d6: 4
---

# amplitude-experiment-test

## Overview

Per
[amplitude.com/docs/experiment](https://amplitude.com/docs/experiment),
the Amplitude Experiment SDKs (server-side and client-side)
expose `fetch` + `variant` APIs: fetch the user's assigned
variants, then read each variant on demand.

Amplitude correlates exposure + outcome events via the same
user ID space as Amplitude Analytics, so exposure-event
suppression in tests is important to avoid polluting analytics.

## When to use

- Tests for code that reads an Amplitude Experiment variant.
- Suppressing exposure events in non-production test runs.
- Assignment-integrity tests per
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
  Step 3.

## Authoring

### Install

```bash
pip install amplitude-experiment           # Python (server-side)
npm install --save-dev @amplitude/experiment-node-server
```

### Initialize (server-side)

```typescript
import * as Experiment from '@amplitude/experiment-node-server';

const client = Experiment.Experiment.initializeRemote(API_KEY, {
  // Suppress real fetches in tests
  fetchTimeoutMillis: 1000,
});
```

For fully-offline tests, use the **local evaluation** mode and seed the
flag config via the `bootstrap` option. Per the
[local-evaluation docs](https://amplitude.com/docs/experiment/general/evaluation/local-evaluation),
`start()` takes no arguments and always performs an initial network fetch
(it throws offline and would clear a bootstrapped cache), so do NOT call it
for a no-network test: `bootstrap` populates the cache in the constructor.

```typescript
import { LocalEvaluationClient } from '@amplitude/experiment-node-server';
import { readFileSync } from 'fs';

// Commit the flag config the flags endpoint would return, keyed by flag key.
const flagFixture = JSON.parse(readFileSync('fixtures/flags.json', 'utf8'));

const localClient = new LocalEvaluationClient(API_KEY, {
  bootstrap: flagFixture,   // seeds the cache; no start() / no network
});
```

### Read variant (offline, synchronous)

`evaluateV2` reads straight from the bootstrapped cache, no fetch required:

```typescript
const user = { user_id: 'user-1', device_id: 'dev-1' };

test('user variant from local eval', () => {
  const variants = localClient.evaluateV2(user);
  expect(variants['checkout-experiment'].value).toBe('treatment-a');
});
```

### Force a variant for a test

Amplitude Experiment's standard pattern is via the flag config:
override the flag's default-variant for a specific user ID by
modifying the local-eval fixture. Alternatively, mock the
`evaluate` method:

```typescript
import { jest } from '@jest/globals';

test('user in treatment', () => {
  jest.spyOn(localClient, 'evaluateV2').mockReturnValue({
    'checkout-experiment': { value: 'treatment-a' } as any,
  });

  const variants = localClient.evaluateV2(user);
  expect(variants['checkout-experiment'].value).toBe('treatment-a');
});
```

### Suppress exposure events in tests

Default behavior fires an exposure event on `variant()` read.
Suppress per
[amplitude.com/docs/experiment](https://amplitude.com/docs/experiment):

```typescript
// In test setup:
const client = Experiment.Experiment.initializeRemote(API_KEY, {
  // Disable automatic exposure tracking
  automaticExposureTracking: false,
});
```

### Assignment integrity tests

```typescript
test('deterministic assignment', () => {
  const v1 = localClient.evaluateV2({ user_id: 'user-1' });
  const v2 = localClient.evaluateV2({ user_id: 'user-1' });
  expect(v1).toEqual(v2);
});
```

## Running

```bash
npm test
```

## CI integration

```yaml
jobs:
  amplitude-experiment-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
        env:
          AMPLITUDE_API_KEY: ${{ secrets.AMPLITUDE_TEST_KEY }}
```

For fully-offline CI: skip the env var and use local-eval with
checked-in flag config JSON.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests use prod Amplitude key | Test users pollute analytics | Use test workspace + dev key |
| Exposure events enabled in CI | Spurious exposure tracking | `automaticExposureTracking: false` |
| Mocking variant() result without testing the fetch | Misses fetch-network bugs | Test both layers separately |
| Local-eval flag JSON not committed | Test flakes when prod changes | Commit fixture |
| Skipping `client.stop()` / cleanup | Network handles leak | Always teardown |
| Different user-ID space between test + analytics | Amplitude correlation broken | Match the prod user-ID strategy |

## Limitations

- **Local-evaluation mode is feature-limited.** Some flag types
  (CMAB, multi-armed bandit) aren't supported offline.
- **Mocking variant() loses targeting-rule fidelity.** Use real
  local-eval when targeting matters.
- **Exposure suppression is binary.** Can't selectively suppress
  per-test.
- **Doesn't validate Amplitude's results analysis.** Platform-side
  statistics separate.

## References

- Amplitude Experiment docs:
  [amplitude.com/docs/experiment](https://amplitude.com/docs/experiment).
- Local evaluation:
  [amplitude.com/docs/experiment/general/evaluation/local-evaluation](https://amplitude.com/docs/experiment/general/evaluation/local-evaluation).
- Companion catalogs:
  [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md),
  [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md),
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md).
- Sibling SDKs:
  [`statsig-test`](../statsig-test/SKILL.md),
  [`optimizely-test`](../optimizely-test/SKILL.md),
  [`vwo-test`](../vwo-test/SKILL.md).
