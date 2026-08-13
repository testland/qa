---
name: feature-flag-test-matrix-reference
description: "Feature-flag test matrix design: the flag-state combinatorics problem (N flags × M variants × K user-segments = N×M×K test cases), the canonical coverage strategies (pairwise interaction coverage; default-only smoke; full matrix; risk-driven matrix), the workflow for building the coverage suite from a flag inventory (grep-based inventory, per-flag classification, PICT pairwise generation, per-cell test skeletons), the dedicated kill-switch test categories (references/killswitch.md: graceful degradation, fail-static default, kill latency, mid-flight consistency), and the flags-vs-experiments distinction. Use when designing the flag-test surface for a new project, building or auditing flag-test coverage, or authoring kill-switch tests."
---

# feature-flag-test-matrix-reference

## Overview

A codebase with N feature flags, each having M variants, and
users in K segments, has N × M × K possible flag-state-segment
combinations. At realistic numbers (50 flags, 2 variants each,
5 segments) that's 500 - and at 50 flags with 3 variants and 10
segments, it's 1500. Testing every combination is infeasible, so the
matrix has to be sampled deliberately rather than enumerated.

This skill is both the reference (the combinatorics + strategies below) and
the coverage-suite-building workflow (see Building the coverage suite); the
per-SDK test mechanics live in `launchdarkly-testing` and
`openfeature-sdk-testing`.

## When to use

- Designing the test surface for a new flag-heavy product.
- Auditing existing flag-test coverage - are critical
  combinations covered?
- PR review of a new flag - does it create a coverage gap?
- Investigating an "only happens with flag X + flag Y on"
  incident.

## How to use

1. Inventory the flags: list every flag, its variant count (M), and the user segments (K) it targets.
2. Size the problem: compute N × M × K to confirm full enumeration is infeasible and sampling is required.
3. Discover interactions: mark flags as inert (independent) or known-interacting (auth + permissions, billing + plan-tier), pulling from a risk register where one exists.
4. Pick a coverage strategy from the five below - default-only smoke, per-flag isolation, pairwise, full matrix, or risk-driven - matching the flag set's risk.
5. Add the special flag-state categories (kill-switch, percentage-rollout, sticky-assignment, default-on-error) as their own tests.
6. Layer the resulting cases across unit, integration, E2E, and production-smoke.
7. Hand the matrix to the platform SDK skill (`launchdarkly-testing`, or `openfeature-sdk-testing` for OpenFeature / Unleash / Flagsmith / GrowthBook) to implement each case.

## The combinatorics

| Variable | Typical scale |
|---|---|
| Total flags in codebase | 20-500 |
| Variants per flag | 2 (most), 3-5 (experiments), 10+ (multivariate) |
| User segments | 5-20 (free, paid, enterprise, internal, beta, etc.) |
| Combinatorial total | Quickly enters thousands |

**Insight:** most flag combinations are inert (independent). Only
a small subset interact - the test matrix should target
interactions.

## Five coverage strategies

### 1. Default-only smoke

Test only the default-value combination ("all flags off" or "all
flags at default"). Fast but misses everything.

**Use when:** flag-heavy codebase where defaults change rarely.

### 2. Per-flag isolation

For each flag, test default + each variant in isolation. N × M
tests; ignores interactions.

**Use when:** flags are mostly independent (UI tweaks,
language strings, low-risk).

### 3. Pairwise interaction

Test every pair of flags (combinatorial 2-way coverage). Per
NIST SP 800-142 on combinatorial testing, pairwise catches ~67%
of real defects with O(N²) combinations.

**Use when:** flags are known-interacting (auth + permissions,
billing + plan-tier).

Implementation: tools like `pict` (Microsoft) generate the
pairwise matrix from a flag inventory.

### 4. Full matrix

Every combination. N^M tests for boolean flags.

**Use when:** small (≤10) flag count with strong interaction;
financial / regulatory paths.

### 5. Risk-driven

Custom matrix targeting (flag, segment) cells with known risk
(per a risk register per `risk-matrix` in the qa-process plugin).

**Use when:** any non-trivial codebase. Best in practice.

## Building the coverage suite

The workflow that turns the strategies above into a committed matrix + test
skeletons:

1. **Inventory flags** - grep for SDK calls and emit a flag inventory:

```bash
grep -rn 'isOn\|isEnabled\|variation\|getFeatureValue' --include='*.{ts,js,py,go,java}' .
```

```yaml
flags:
  - name: show-new-ui
    platform: launchdarkly
    type: boolean
    found_at: [src/components/Header.tsx:42, src/pages/Dashboard.tsx:88]
  - name: checkout-experiment
    type: multi-variant
    variants: [control, treatment-a, treatment-b]
```

2. **Classify each flag** - kill-switch (naming: `*-kill`, `disable-*`,
   `emergency-*`), experiment (multi-variant + analytics), permission-gated,
   UI tweak, migration (`use-new-*`), plan/tier gating. The class picks the
   strategy: default-only smoke for UI tweaks, per-flag isolation for
   migrations, pairwise for permission/plan interactions, full matrix for
   kill-switches + regulatory paths, risk-driven for the rest.
3. **Generate the matrix** - for pairwise use
   [PICT](https://github.com/microsoft/pict) (`pict pict.txt > matrix.tsv`
   emits a pairwise-covering matrix, e.g. ≤12 tests instead of 24 for full);
   for risk-driven, combine with the risk register (`risk-matrix` in the
   qa-process plugin) - high-impact x high-likelihood cells become required
   tests.
4. **Emit a per-cell test skeleton** - one describe block per flag (or
   flag-pair), one test per cell, with the SDK pinned via the platform's
   test data source:

```typescript
describe('auth flag matrix', () => {
  test('free user, new auth on → new flow', () => {
    td.update(td.flag('use-new-auth').booleanFlag().on(true));
    expect(authFlow({ plan: 'free' })).toBe('new');
  });
});
```

5. **Add the special-category tests** regardless of matrix coverage:
   kill-switch deactivation latency (see
   [references/killswitch.md](references/killswitch.md)), default-on-error
   (SDK failure returns the call-site default), and sticky-assignment (same
   user, same variant across evaluations).
6. **Commit the matrix + document the gaps** - `flag-coverage.yaml` in the
   repo, plus a coverage doc listing covered cells and deliberate gaps with
   reasons, so drift is reviewable.

## Special flag-state test categories

| Category | Test |
|---|---|
| **Kill-switch** | Setting flag → off must halt the feature within N seconds (cache TTL); full four-category treatment in [references/killswitch.md](references/killswitch.md) |
| **Percentage rollout** | Flag at 10% → ~10% of users in 'on' bucket; SDK assignment stable per user |
| **Targeted rollout** | Targeting `region=EU` → only EU users get treatment |
| **Sticky assignment** | Same user → same variant across sessions and re-launches |
| **Override hierarchy** | User-specific override > segment override > default |
| **Default-on-error** | SDK fails / network down → default value returned |
| **Fast-deactivate** | Toggle flag off → live users see new state on next evaluation |

These are **per-platform** behaviours (LaunchDarkly, Unleash,
Flagsmith, GrowthBook implement them differently); test per
platform per the SDK skills.

## Flag-test layering

Tests should run at multiple layers:

| Layer | Coverage |
|---|---|
| Unit | Resolver / handler logic gated on flag value (mock SDK) |
| Integration | SDK + handler together (test SDK against local-eval / fixture) |
| E2E | Real flag toggle → real user sees the change |
| Production smoke | After flag change → assert expected behaviour live |

## Flag-experiment distinction

Per `ab-test-validity-checklist` (in the qa-experimentation plugin):

| Flag | Experiment |
|---|---|
| Toggles behaviour | Measures outcome |
| Boolean / multi-variant | Multi-arm with metrics |
| Test the behaviour change | Test the assignment + outcome correlation |
| Ship decision on engineering judgment | Ship decision on statistical result |

A feature flag can power an experiment (the flag is the
allocation mechanism), but tests are layered: flag tests verify
correct behaviour per variant; experiment tests verify
assignment + analytics.

## Worked example

A billing service has 3 boolean flags - `new_checkout`, `annual_discount`, `tax_engine_v2` - across 3 segments (free, paid, enterprise). The team knows `annual_discount` and `tax_engine_v2` interact: a discount changes the taxable amount.

1. Inventory: 3 flags, 2 variants each, 3 segments; the full flag-state-by-segment cross-product is too large to enumerate.
2. Interaction discovery marks the `annual_discount` × `tax_engine_v2` pair as known-interacting; `new_checkout` is a UI change treated as independent.
3. Strategy: risk-driven. Per-flag isolation covers `new_checkout`; a pairwise cell covers (`annual_discount` on, `tax_engine_v2` on) on the paid and enterprise segments where money moves.
4. Special categories: a kill-switch test asserts toggling `tax_engine_v2` off reverts to v1 within the cache TTL; a sticky-assignment test asserts the `annual_discount` percentage rollout keeps each user in the same bucket across sessions.
5. Layering: unit tests exercise the tax resolver per flag value; an E2E test toggles `tax_engine_v2` and asserts an enterprise invoice total.

Result: a handful of targeted cases instead of the full cross-product, with the discount × tax interaction covered explicitly.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only default-value path | Misses every flag-on case | Per-flag isolation minimum |
| Mock the SDK to return constant | Misses targeting / rollout logic | Local-eval mode or fixture-based SDK |
| Same test for every flag combination | Slow; flaky; opaque failures | Per-combination assertion logs |
| No kill-switch test | Production incident has no rehearsed response | Test deactivation latency |
| Don't test percentage-rollout sticky-assignment | Rollout produces non-deterministic UX | Per `ab-test-validity-checklist` |
| Tests assume flag-on default | Real default-off behaviour untested in CI | Test both paths |
| No cleanup test for removed flags | Stale flags accumulate | Periodic audit via the `stale-flag-detector` agent |
| Pairwise without flag-interaction discovery | Some pairs spuriously interact | Couple with risk-register input |

## Limitations

- **Pairwise misses 3-way+ interactions.** Some real-world
  bugs need 3-way coverage.
- **Real-world matrices have ordering effects.** Flag A enabled
  THEN flag B may differ from B then A; test ordering needs
  separate coverage.
- **Coverage tooling lags.** PICT / ACTS exist but integration
  with flag platforms is bespoke.
- **Stale flags pollute the matrix.** Cleanup pairs with the
  `stale-flag-detector` agent's removal runbook.

## References

- LaunchDarkly flag-testing strategy:
  [launchdarkly.com/blog/](https://launchdarkly.com/blog/).
- NIST SP 800-142 (combinatorial testing):
  [csrc.nist.gov/publications/detail/sp/800-142/final](https://csrc.nist.gov/publications/detail/sp/800-142/final).
- GrowthBook test docs:
  [docs.growthbook.io/lib/node](https://docs.growthbook.io/lib/node).
- Kill-switch test categories:
  [references/killswitch.md](references/killswitch.md).
- Consumed by:
  `launchdarkly-testing`,
  `openfeature-sdk-testing`.
- Removal side: `stale-flag-detector` agent.
- Cross-plugin:
  `ab-test-validity-checklist`,
  `feature-flag-test-harness`.
