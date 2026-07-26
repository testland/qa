# Anti-patterns and limitations

[of-prov]: https://openfeature.dev/docs/reference/concepts/provider
[toggles]: https://martinfowler.com/articles/feature-toggles.html

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
