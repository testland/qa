---
name: feature-flag-test-matrix-reference
description: "Pure-reference catalog of feature-flag test matrix design. Defines the flag-state combinatorics problem (N flags × M variants × K user-segments = N×M×K test cases), the canonical coverage strategies (pairwise interaction coverage; default-only smoke; full matrix; risk-driven matrix), the kill-switch + percentage-rollout test patterns, and the relationship between flags + experiments (flags toggle behaviour; experiments measure outcome). Use when designing the flag-test surface for a new project or auditing existing flag-test coverage. Composes flag-state-coverage-builder + flag-removal-runbook-author."
---

# feature-flag-test-matrix-reference

## Overview

A codebase with N feature flags, each having M variants, and
users in K segments, has N × M × K possible flag-state-segment
combinations. At realistic numbers (50 flags, 2 variants each,
5 segments) that's 500 - and at 50 flags with 3 variants and 10
segments, it's 1500. Testing every combination is infeasible.

Per [launchdarkly.com/blog](https://launchdarkly.com/blog/):
"The matrix grows exponentially; pick coverage smartly."

This skill is a **pure reference** consumed by the SDK-test +
coverage-builder skills.

## When to use

- Designing the test surface for a new flag-heavy product.
- Auditing existing flag-test coverage - are critical
  combinations covered?
- PR review of a new flag - does it create a coverage gap?
- Investigating an "only happens with flag X + flag Y on"
  incident.

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
(per a risk register per [`qa-process/risk-matrix`](../../../qa-process/skills/risk-matrix/SKILL.md)).

**Use when:** any non-trivial codebase. Best in practice.

## Special flag-state test categories

| Category | Test |
|---|---|
| **Kill-switch** | Setting flag → off must halt the feature within N seconds (cache TTL) |
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

Per
[`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md):

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only default-value path | Misses every flag-on case | Per-flag isolation minimum |
| Mock the SDK to return constant | Misses targeting / rollout logic | Local-eval mode or fixture-based SDK |
| Same test for every flag combination | Slow; flaky; opaque failures | Per-combination assertion logs |
| No kill-switch test | Production incident has no rehearsed response | Test deactivation latency |
| Don't test percentage-rollout sticky-assignment | Rollout produces non-deterministic UX | Per [`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md) |
| Tests assume flag-on default | Real default-off behaviour untested in CI | Test both paths |
| No cleanup test for removed flags | Stale-flag accumulates per [`flag-removal-runbook-author`](../flag-removal-runbook-author/SKILL.md) | Periodic stale-flag audit |
| Pairwise without flag-interaction discovery | Some pairs spuriously interact | Couple with risk-register input |

## Limitations

- **Pairwise misses 3-way+ interactions.** Some real-world
  bugs need 3-way coverage.
- **Real-world matrices have ordering effects.** Flag A enabled
  THEN flag B may differ from B then A; test ordering needs
  separate coverage.
- **Coverage tooling lags.** PICT / ACTS exist but integration
  with flag platforms is bespoke.
- **Stale flags pollute the matrix.** Cleanup pairs with
  [`flag-removal-runbook-author`](../flag-removal-runbook-author/SKILL.md).

## References

- LaunchDarkly flag-testing strategy:
  [launchdarkly.com/blog/](https://launchdarkly.com/blog/).
- NIST SP 800-142 (combinatorial testing):
  [csrc.nist.gov/publications/detail/sp/800-142/final](https://csrc.nist.gov/publications/detail/sp/800-142/final).
- GrowthBook test docs:
  [docs.growthbook.io/lib/node](https://docs.growthbook.io/lib/node).
- Sibling catalogs:
  [`flag-state-coverage-builder`](../flag-state-coverage-builder/SKILL.md),
  [`flag-removal-runbook-author`](../flag-removal-runbook-author/SKILL.md).
- Consumed by:
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`flagsmith-testing`](../flagsmith-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md),
  [`stale-flag-detector`](../../agents/stale-flag-detector.md).
- Cross-plugin:
  [`qa-experimentation/ab-test-validity-checklist`](../../../qa-experimentation/skills/ab-test-validity-checklist/SKILL.md),
  [`qa-test-environment/feature-flag-test-harness`](../../../qa-test-environment/skills/feature-flag-test-harness/SKILL.md).
