---
name: experiment-sdk-testing
description: "Umbrella for experimentation-SDK test harnesses: the shared offline-datafile / hermetic-init pattern (commit a point-in-time flag/experiment config fixture, initialize the SDK with no network, pin arms per test, assert assignment integrity), with per-vendor references for Statsig (localMode + overrideGate), Optimizely (datafile + forced decisions), Split.io / Harness FME (localhost mode + features map or YAML fixture), Amplitude Experiment (local evaluation + bootstrap), and VWO (settings file + deterministic bucketing). Use when writing tests for application code instrumented with any of these five experimentation SDKs; for experiment DESIGN gates use ab-test-validity-checklist, and to read results use experiment-results-interpreter."
---

# experiment-sdk-testing

## Overview

Every major experimentation SDK ships the same hermetic-test mechanism
under a different name: a **point-in-time config fixture** (datafile,
settings file, flag payload, features map) that the SDK evaluates locally,
so tests make zero network calls, pollute no production analytics, and stay
deterministic. The vendor-specific mechanics differ only in how the fixture
is loaded and how an arm is pinned.

## Routing table

| SDK | Offline mechanism | Arm pinning | Reference |
|---|---|---|---|
| Statsig | `localMode: true` | `overrideGate` / `overrideConfig` | [references/statsig.md](references/statsig.md) |
| Optimizely | JSON datafile fixture | `set_forced_decision` | [references/optimizely.md](references/optimizely.md) (+ [optimizely-recipes.md](references/optimizely-recipes.md)) |
| Split.io / Harness FME | `authorizationKey: 'localhost'` + features map / YAML | Per-key fixture entry (no override API) | [references/split-io.md](references/split-io.md) (+ [split-io-example.md](references/split-io-example.md)) |
| Amplitude Experiment | LocalEvaluationClient + `bootstrap` | Fixture edit or `evaluateV2` mock | [references/amplitude.md](references/amplitude.md) |
| VWO | Settings file + `is_development_mode` | Deterministic bucketing on user ID | [references/vwo.md](references/vwo.md) |

## When to use

- Tests for code that reads a gate / experiment / variant from any of the
  five SDKs above.
- Assignment-integrity tests per `ab-test-validity-checklist` Step 3.
- CI pipelines that must run without vendor network access.

## The shared hermetic-init pattern

Regardless of vendor, the suite has the same five steps:

1. **Export and commit the config fixture** - the datafile / settings /
   flag payload the SDK would fetch, checked into `tests/fixtures/` and
   refreshed deliberately (drift between fixture and prod config is
   invisible otherwise).
2. **Initialize the SDK offline** - the vendor's no-network switch
   (`localMode`, datafile string, `'localhost'` key, `bootstrap`,
   `is_development_mode`).
3. **Pin the arm where the test needs one** - override API, forced
   decision, per-key fixture entry, or a deterministically-bucketed user
   ID.
4. **Assert on values and keys, never internal IDs** - variation keys and
   returned values survive environment changes; internal config IDs don't.
5. **Tear down** - shutdown / destroy the client so event-flush timers and
   handles don't leak across test files.

Plus two integrity tests every suite should carry:

- **Determinism** - the same user ID gets the same arm on repeated
  evaluation.
- **Distribution** - across many user IDs, more than one arm actually
  occurs (and, where the split is known, roughly matches it).

## Worked example (Optimizely datafile)

The team ships a `new_checkout_flow` flag with a `treatment_a` variation
and needs a deterministic test that a premium-plan user is routed into the
treatment:

```python
import json
from optimizely import optimizely

# Step 1-2: committed fixture, offline init - no SDK key, no network
with open("tests/fixtures/optimizely-datafile.json") as f:
    client = optimizely.Optimizely(f.read())

def test_premium_user_in_treatment():
    # Step 3: context carries the attributes targeting needs
    user = client.create_user_context("user-1", {"plan": "premium"})
    decision = user.decide("new_checkout_flow")
    # Step 4: assert on enabled + variation_key, not IDs
    assert decision.enabled is True
    assert decision.variation_key == "treatment_a"

def test_assignment_deterministic():
    user = client.create_user_context("user-1")
    d1 = user.decide("new_checkout_flow")
    d2 = user.decide("new_checkout_flow")
    assert d1.variation_key == d2.variation_key
```

The fixture drives the whole decision; the same shape translates to each
vendor via its reference above.

## Anti-patterns (all vendors)

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Live API key in tests | Production analytics polluted; rate limits; flakes | The vendor's offline switch |
| Fixture not version-controlled | Tests flake when prod config changes | Commit; refresh deliberately |
| Overrides / forced decisions leak across tests | Cross-test pollution | Per-test context + cleanup |
| Asserting on internal config / variation IDs | IDs change per environment | Assert keys and values |
| Skipping client shutdown / destroy | Event-flush timers and handles leak | Teardown in afterAll |
| Trusting one user ID to cover both arms | May bucket into one arm only | Distribution test across many IDs |

## Limitations

- **Fixtures are point-in-time.** Drift against the vendor UI is invisible
  until refreshed.
- **Offline modes don't validate the vendor's server-side analysis.**
  Platform statistics are the vendor's job; these tests cover your code's
  SDK interaction only.
- **Per-vendor gaps** (Statsig localMode still pings on some init paths;
  Split.io has no override API; Amplitude local evaluation lacks some flag
  types; VWO has no forced-decision API) are documented in each reference.

## References

- Per-vendor mechanics: [references/statsig.md](references/statsig.md),
  [references/optimizely.md](references/optimizely.md),
  [references/split-io.md](references/split-io.md),
  [references/amplitude.md](references/amplitude.md),
  [references/vwo.md](references/vwo.md).
- Experiment design gates: `ab-test-validity-checklist`.
- Reading results (peeking, guardrails, novelty): `experiment-results-interpreter`.
- SRM detection: `sample-ratio-mismatch-detector` agent.
