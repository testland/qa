---
name: feature-flag-test-harness
description: "Builds a test harness that runs the same suite under every relevant flag combination - picks the minimum cover (single flags + pairwise interactions where the team marks them, not the full 2^N cartesian product), wires an OpenFeature in-memory provider so the suite never hits the production flag service, runs each combination as its own labeled CI matrix shard, and emits a per-combination result matrix. Use when a feature behind a flag must be verified on AND off (release toggles + experiment toggles per Hodgson) and the team wants those runs deterministic and parallel."
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

## How to use

1. Classify each flag by Hodgson category (Step 1) and mark which
   flag pairs actually interact.
2. Enumerate the minimum cover - single-flag variants plus the
   declared interaction tuples, never the full 2^N product.
3. Wire the OpenFeature in-memory provider so the suite never hits
   the production flag service - see
   [references/provider-wiring.md](references/provider-wiring.md).
4. Generate the combination matrix and run one CI shard per
   combination - see
   [references/matrix-and-ci.md](references/matrix-and-ci.md).
5. Keep `fail-fast: false` on the matrix so every failing
   combination surfaces in one run, not just the first.
6. Aggregate each shard's JUnit XML into a per-combination pass/fail
   matrix the reviewer reads at a glance.
7. Split cadence: PR runs only combinations whose flags touch
   changed files; nightly runs the full matrix.

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

## Provider wiring, matrix generation, CI

- In-memory provider wiring (Node / Python / Java) plus the standard
  evaluation API and default-value behavior:
  [references/provider-wiring.md](references/provider-wiring.md).
- Combination-matrix generator, CI matrix YAML, result aggregation,
  and the PR / nightly cadence split:
  [references/matrix-and-ci.md](references/matrix-and-ci.md).

## Worked example

A checkout team ships `new_checkout` (release) and `promo_codes`
(release) behind flags, runs a `ranking_experiment` (control /
treatment_a / treatment_b), and guards payments with a
`payment_kill_switch` (ops). They author `tests/flag-matrix.yaml`
exactly as in Step 1 and declare the one interaction that matters:
`[new_checkout, promo_codes]`.

`gen-flag-matrix.py` enumerates 9 single-flag runs (2 + 2 + 3 + 2)
plus 4 interaction runs (new_checkout × promo_codes) = 13 shards,
not the 24 of the full 2^N product. Each shard boots the suite with
the in-memory provider pinned to that combination via `FLAGS_JSON`,
so no run touches the production flag service.

CI runs all 13 shards in parallel with `fail-fast: false`. The
aggregated matrix shows `promo_codes=on` red at `checkout.spec.ts:42`
and `ranking_experiment=treatment_b` red at `cart.spec.ts:18`, while
the baseline and every other combination pass. The team reads two
flag-specific failures in one glance instead of re-running to find
the second.

## Anti-patterns and limitations

The full anti-pattern table (2^N blowup, hitting the prod provider,
asserting flag value instead of behavior, `fail-fast: true`, missing
baseline row) and the harness's limitations (no targeting rules,
author-declared interactions, per-request dynamism, matrix-size
bound) are in
[references/anti-patterns-and-limits.md](references/anti-patterns-and-limits.md).

## References

- [openfeature-overview][of-int] - OpenFeature SDK + provider model.
- [openfeature-providers][of-prov] - Provider interface, in-memory
  test provider.
- [openfeature-eval][of-eval] - `getBooleanValue` / `getStringValue`
  / `getNumberValue` / `getObjectValue` signatures + default-value
  behavior.
- [feature-toggles][toggles] - Hodgson's taxonomy: release /
  experiment / ops / permissioning; longevity vs dynamism.
- `testcontainers`,
  `docker-compose-tests` - the surrounding stack the harness drives
  per combination.

[of-eval]: https://openfeature.dev/docs/reference/concepts/evaluation-api
