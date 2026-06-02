---
name: feature-flag-test-harness
description: "Builds a test harness that runs the same suite under every relevant flag combination - picks the minimum cover (single flags + pairwise interactions where the team marks them, not the full 2^N cartesian product), wires an OpenFeature in-memory provider so the suite never hits the production flag service, runs each combination as its own labeled CI matrix shard, and emits a per-combination result matrix. Use when a feature behind a flag must be verified on AND off (release toggles + experiment toggles per Hodgson) and the team wants those runs deterministic and parallel."
rating: 23
d6: 4
archetype: S3
---

# feature-flag-test-harness

## Overview

A test that hits the production flag service is non-deterministic by
definition - the answer depends on whoever toggled the flag last.
And a test that asks "did we test the feature with the flag off?"
needs both runs side by side.

This skill builds a harness that:

1. Replaces the production OpenFeature provider with an **in-memory
   provider** the test owns ([openfeature-providers][of-prov]).
2. Enumerates the relevant flag combinations (not the full 2^N
   cartesian product - the long tail isn't worth running).
3. Runs the suite once per combination, as a separate CI shard.
4. Aggregates results into a matrix the reviewer can read.

The skill's reference architecture targets **OpenFeature** because
it standardizes the SDK across LaunchDarkly, Flagsmith, ConfigCat,
self-hosted, etc. - the harness works identically against any
provider ([openfeature-overview][of-int]).

[of-int]: https://openfeature.dev/docs/reference/intro
[of-prov]: https://openfeature.dev/docs/reference/concepts/provider

> "OpenFeature provides a shared, standardized feature flagging
> client - an _SDK_ - which can be plugged into various 3rd-party
> feature flagging _providers_." ([openfeature-overview][of-int])

## When to use

- A new feature lives behind a release toggle and the team needs to
  verify both code paths (toggle off = old behavior unchanged;
  toggle on = new behavior correct).
- An experiment toggle has multiple variants (A / B / control) and
  each needs an integration-test pass.
- An ops toggle (kill switch / degradation flag) needs a "service
  fails open" pass.
- The flag set already exists in OpenFeature, LaunchDarkly,
  Flagsmith, ConfigCat, GrowthBook, or any SDK with an in-memory /
  test provider.

If the team has only one or two flags **and** a flat "always on for
test" config works, this skill is overkill - set the test
environment's flag values once in `setup` and stop there.

## Step 1 - Classify each flag (Hodgson taxonomy)

Per [feature-toggles][toggles], flags fall into four categories with
different test needs:

[toggles]: https://martinfowler.com/articles/feature-toggles.html

| Category               | Lifespan       | Dynamism            | Test combinations needed                    |
|------------------------|----------------|---------------------|---------------------------------------------|
| **Release toggle**     | Days - weeks     | Static at deploy    | OFF (current) **and** ON (new behavior). 2 runs. |
| **Experiment toggle**  | Days - weeks     | Per-request dynamic | One run per variant (A / B / control).       |
| **Ops toggle**         | Long-lived     | Per-request dynamic | ON (normal) and OFF (degraded / kill).      |
| **Permissioning toggle** | Years        | Per-request dynamic | One run per relevant user cohort.           |

Per [feature-toggles][toggles]: "Each user of the system is placed
into a cohort and at runtime the Toggle Router will consistently
send a given user down one codepath or the other." For experiment +
permissioning toggles, the test harness simulates the cohort by
seeding the EvaluationContext.

Don't run all 2^N combinations. Author marks the **interactions
worth testing**:

```yaml
# tests/flag-matrix.yaml
flags:
  new_checkout:        { kind: release,  test: [off, on] }
  promo_codes:         { kind: release,  test: [off, on] }
  ranking_experiment:  { kind: experiment, variants: [control, treatment_a, treatment_b] }
  payment_kill_switch: { kind: ops,      test: [on, off] }   # off = degraded

interactions:
  # The author asserts these flag pairs interact; run their combinations explicitly.
  - [new_checkout, promo_codes]
  # Ranking experiment doesn't interact with checkout; don't bloat the matrix.
```

The harness enumerates: every flag's variants individually + the
listed interaction tuples. Single flags = 2 + 2 + 3 + 2 = 9 runs.
Plus the one declared interaction (new_checkout × promo_codes) = +4 runs.
Total: 13 runs, not 24 (2 × 2 × 3 × 2).

## Step 2 - Wire the OpenFeature in-memory provider

Per [openfeature-providers][of-prov], "Providers are responsible for
performing flag evaluations" - the in-memory test provider returns
the flag values the test wants.

### Node / TypeScript

```typescript
// tests/harness/flag-harness.ts
import { OpenFeature, InMemoryProvider } from '@openfeature/server-sdk';

export function withFlags(flags: Record<string, unknown>) {
  const provider = new InMemoryProvider(
    Object.fromEntries(
      Object.entries(flags).map(([k, v]) => [k, {
        defaultVariant: 'configured',
        variants: { configured: v },
        disabled: false,
      }]),
    ),
  );
  return OpenFeature.setProviderAndWait(provider);
}
```

Then in the test setup:

```typescript
import { withFlags } from './harness/flag-harness';

beforeAll(async () => {
  await withFlags(JSON.parse(process.env.FLAGS_JSON || '{}'));
});
```

### Python

```python
# tests/harness/flag_harness.py
from openfeature.api import set_provider
from openfeature.provider.in_memory_provider import InMemoryProvider, InMemoryFlag

def with_flags(flags: dict):
    set_provider(InMemoryProvider({
        k: InMemoryFlag(default_variant='configured',
                        variants={'configured': v})
        for k, v in flags.items()
    }))
```

### Java

```java
import dev.openfeature.sdk.OpenFeatureAPI;
import dev.openfeature.contrib.providers.memory.InMemoryProvider;

@BeforeAll
static void wireFlags() {
    var flags = parseEnv(System.getenv("FLAGS_JSON"));  // your JSON parser
    OpenFeatureAPI.getInstance().setProvider(new InMemoryProvider(flags));
}
```

The application code calls the standard OpenFeature evaluation API
([openfeature-eval][of-eval]):

[of-eval]: https://openfeature.dev/docs/reference/concepts/evaluation-api

```typescript
const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue('new_checkout', false);
```

Per [openfeature-eval][of-eval]: "the default value must also be
specified ... In the case of any error during flag evaluation, the
default value will be returned, so give consideration to your
default values!" The harness picks the value the in-memory provider
returns; the application's hard-coded default is what runs in
prod-flag-failure scenarios.

## Step 3 - Generate the combination matrix

A small generator script enumerates the combinations from
`flag-matrix.yaml`:

```python
# scripts/gen-flag-matrix.py
import json, sys, yaml
from itertools import product

cfg = yaml.safe_load(open(sys.argv[1]))
combos = []

# Single-flag variants
for flag, spec in cfg['flags'].items():
    base = {f: defaultFor(s) for f, s in cfg['flags'].items()}
    for variant in spec.get('test', spec.get('variants', [])):
        combo = dict(base)
        combo[flag] = variant
        combos.append({'name': f'{flag}={variant}', 'flags': combo})

# Declared interactions
for tuple_flags in cfg.get('interactions', []):
    spaces = [cfg['flags'][f].get('test', cfg['flags'][f].get('variants', [])) for f in tuple_flags]
    base = {f: defaultFor(s) for f, s in cfg['flags'].items()}
    for combo_values in product(*spaces):
        combo = dict(base)
        for f, v in zip(tuple_flags, combo_values):
            combo[f] = v
        combos.append({
            'name': '+'.join(f'{f}={v}' for f, v in zip(tuple_flags, combo_values)),
            'flags': combo,
        })

print(json.dumps(combos, indent=2))

def defaultFor(spec):
    if 'test' in spec: return spec['test'][0]   # first listed variant is the baseline
    return spec['variants'][0]
```

Output: a JSON array of `{name, flags}` objects, one per CI shard.

## Step 4 - Wire the CI matrix

```yaml
# .github/workflows/flag-harness.yml
name: flag-harness
on:
  pull_request:
    paths:
      - 'tests/flag-matrix.yaml'
      - 'src/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    outputs:
      combos: ${{ steps.gen.outputs.combos }}
    steps:
      - uses: actions/checkout@v5
      - id: gen
        run: |
          combos=$(python scripts/gen-flag-matrix.py tests/flag-matrix.yaml)
          echo "combos=$combos" >> "$GITHUB_OUTPUT"

  test:
    needs: generate
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      max-parallel: 8
      matrix:
        combo: ${{ fromJSON(needs.generate.outputs.combos) }}
    name: test (${{ matrix.combo.name }})
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
        env:
          FLAGS_JSON: ${{ toJSON(matrix.combo.flags) }}
```

`fail-fast: false` is load-bearing - when one combination fails,
the matrix continues so the team sees every failing combination at
once, not just the first.

## Step 5 - Aggregate the result matrix

After the matrix runs, build a single artifact that shows pass/fail
per combination:

```markdown
## Flag harness results — `<sha>`

| Combination                                          | Result | Failures              |
|------------------------------------------------------|:------:|-----------------------|
| baseline (all flags = baseline)                       |   ✅   |                       |
| new_checkout=on                                       |   ✅   |                       |
| new_checkout=off                                      |   ✅   |                       |
| promo_codes=on                                        |   ❌   | `checkout.spec.ts:42` |
| ranking_experiment=treatment_a                        |   ✅   |                       |
| ranking_experiment=treatment_b                        |   ❌   | `cart.spec.ts:18`     |
| new_checkout=on + promo_codes=on                      |   ❌   | `checkout.spec.ts:42`, `promo.spec.ts:7` |
| payment_kill_switch=off                               |   ✅   |                       |
```

The aggregator reads each shard's JUnit XML, groups by combo name,
emits the table. Failures column links to the failing test files for
quick triage.

## Step 6 - Pre-merge / nightly cadence

- **Pre-merge (PR):** Run only the combinations whose flags appear in
  changed files. The flag-matrix YAML lists owner files per flag:
  ```yaml
  flags:
    new_checkout: { ..., owners: [src/checkout/**] }
  ```
  The CI step `git diff --name-only origin/main...HEAD | grep -f owners.glob` selects.
- **Nightly:** Run the full matrix. Catches drift in flags whose
  owner files weren't touched but whose behavior was affected by
  upstream code.

This split keeps PR runtime bounded while still gaining full
coverage every 24h.

## Anti-patterns

| Anti-pattern                                                        | Why it fails                                                                | Fix |
|---------------------------------------------------------------------|-----------------------------------------------------------------------------|-----|
| Running the full 2^N cartesian product                              | N=10 flags = 1024 shards; CI bill explodes; most combinations are irrelevant. | Single-flag variants + author-declared interaction tuples (Step 1). |
| Hitting the production OpenFeature provider from tests              | Non-deterministic; flaky; depends on whoever toggled last.                  | InMemoryProvider per [openfeature-providers][of-prov]. |
| Hard-coding flag values in the test instead of the harness           | Each test re-implements the harness; drift; one test forgets to set a flag. | Centralize in `flag-harness.ts/.py/.java`; tests just assert behavior. |
| Asserting flag *value* in the test (`expect(client.getBooleanValue('new_checkout', false)).toBe(true)`) | Tests the SDK, not the feature. The harness already pinned the value. | Assert the **observable behavior** the flag controls (DOM state, response shape, log line). |
| `fail-fast: true` on the matrix                                      | First failure cancels all other combos; team has to re-run to see the rest. | `fail-fast: false`. |
| Missing the baseline (all-flags-default) row                         | Can't tell whether a failure is flag-specific or a regression on default state. | Always emit a baseline combination as combo #1. |
| Treating ranking_experiment variants as a binary on/off              | Misses variant-specific bugs (e.g., treatment_b breaks but treatment_a passes). | Enumerate every variant per [feature-toggles][toggles] cohort logic. |

## Limitations

- **In-memory provider doesn't model targeting rules.** Real
  LaunchDarkly / Flagsmith may use percentage rollouts, country
  matches, or user-attribute targeting. The harness lets the test
  pin a value; verifying the targeting logic itself needs a
  contract test against the real provider's API (see
  `qa-contract-testing`).
- **Author has to declare interactions.** The harness can't infer
  which flag pairs interact; it relies on the YAML. A missing
  interaction means a missed bug class.
- **Per-request dynamism not exercised by single-shard runs.**
  Experiment / permissioning toggles change per-user; a shard pins
  one value. To test mid-request flag flips, write targeted unit
  tests against the toggle router, not E2E.
- **CI matrix size is bounded by `max-parallel`.** Above ~50
  shards, scheduling overhead dominates; consider sharding by suite
  rather than by combination.

## References

- [openfeature-overview][of-int] - OpenFeature SDK + provider model.
- [openfeature-providers][of-prov] - Provider interface, in-memory
  test provider.
- [openfeature-eval][of-eval] - `getBooleanValue` / `getStringValue`
  / `getNumberValue` / `getObjectValue` signatures + default-value
  behavior.
- [feature-toggles][toggles] - Hodgson's taxonomy: release /
  experiment / ops / permissioning; longevity vs dynamism.
- [`testcontainers`](../testcontainers/SKILL.md),
  [`docker-compose-test`](../docker-compose-test/SKILL.md) - the
  surrounding stack the harness drives per combination.
