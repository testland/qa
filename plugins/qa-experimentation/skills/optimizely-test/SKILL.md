---
name: optimizely-test
description: "Wraps Optimizely Feature Experimentation SDK testing patterns - client init from a fixture datafile (offline-friendly), the decide / decideAll v5 API, forced-decisions for per-test arm pinning, OptimizelyUserContext + activate/track events, assignment-integrity tests. Use when writing tests for Optimizely-instrumented application code. For another experimentation SDK use the matching harness - statsig-test, vwo-test, amplitude-experiment-test, or split-io-test; for experiment DESIGN gates not SDK code use ab-test-validity-checklist."
---

# optimizely-test

## Overview

Optimizely Feature Experimentation (Optimizely Full Stack /
Optimizely X) uses a **datafile** - a JSON blob describing all
flags, experiments, and audiences - that the SDK fetches and
evaluates locally. Per
[docs.developers.optimizely.com/feature-experimentation/docs/python-sdk](https://docs.developers.optimizely.com/feature-experimentation/docs/python-sdk),
the SDK supports datafile-based testing: load a fixture datafile
in tests, no network call.

The current API surface is `decide` (single flag) / `decideAll`
(all flags) per the v5 SDK.

## When to use

- Tests for code that reads an Optimizely flag / experiment.
- Datafile-based snapshot tests for assignment matrices.
- Forced-decisions for per-test arm pinning.

## Authoring

### Install

```bash
pip install optimizely-sdk           # Python
npm install --save-dev @optimizely/optimizely-sdk
```

### Datafile-based initialization

Per Optimizely docs, the datafile path is the canonical offline
approach:

```python
import json
from optimizely import optimizely

# Load a checked-in datafile fixture
with open("tests/fixtures/optimizely-datafile.json") as f:
    datafile = json.load(f)

client = optimizely.Optimizely(json.dumps(datafile))
```

The datafile is downloadable from the Optimizely UI or via the
Optimizely API; commit a version-specific copy to the repo for
deterministic tests.

### Create a user context

```python
def test_get_decision_for_user():
    user = client.create_user_context("user-1", {"plan": "premium"})
    decision = user.decide("new_checkout_flow")
    assert decision.enabled is True
    assert decision.variation_key == "treatment_a"
```

### Forced decisions for per-test pinning

```python
from optimizely.optimizely_user_context import OptimizelyDecisionContext

def test_force_user_to_treatment():
    user = client.create_user_context("user-1")
    context = OptimizelyDecisionContext(flag_key="new_checkout_flow", rule_key=None)
    user.set_forced_decision(context, OptimizelyForcedDecision(variation_key="treatment_a"))

    decision = user.decide("new_checkout_flow")
    assert decision.variation_key == "treatment_a"
```

### Assignment integrity

```python
def test_assignment_deterministic():
    user_a1 = client.create_user_context("user-1")
    user_a2 = client.create_user_context("user-1")
    d1 = user_a1.decide("flag-x")
    d2 = user_a2.decide("flag-x")
    assert d1.variation_key == d2.variation_key

def test_decide_all_returns_consistent_set():
    user = client.create_user_context("user-1")
    decisions_1 = user.decide_all()
    decisions_2 = user.decide_all()
    assert decisions_1.keys() == decisions_2.keys()
```

### Event tracking

```python
def test_conversion_event_emitted():
    captured_events = []
    # Optimizely supports a notification listener
    client.notification_center.add_notification_listener(
        notification_type="TRACK", notification_callback=lambda *args: captured_events.append(args)
    )

    user = client.create_user_context("user-1")
    user.track_event("checkout_completed")
    assert len(captured_events) == 1
```

## Running

```bash
pytest tests/optimizely/
```

## CI integration

```yaml
jobs:
  optimizely-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
      - run: pip install -e ".[test]"
      - run: pytest tests/optimizely/
```

Datafile lives in the repo; no SDK key needed for tests.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Tests with live SDK key | Production data polluted; rate-limited | Use datafile fixture |
| Datafile not version-controlled | Tests flake when prod config changes | Commit the fixture |
| Forced decisions leak across tests | Cross-test pollution | Per-test user context; reset before assertion |
| Skipping `client.shutdown` / network listener cleanup | Goroutine / handle leak | Always cleanup |
| Asserting on variation IDs not keys | IDs change per environment | Use `variation_key` |
| Manual event tracking in tests vs notification listener | Misses platform-emitted events | Use the listener |
| Tests rely on real decide-network roundtrip | Slow; non-deterministic | Datafile + offline |

## Limitations

- **Datafile is point-in-time.** Drift between fixture + prod
  is invisible. Sync periodically.
- **Stickiness depends on bucketing UUID.** If a user's
  bucketing ID changes (e.g., from anonymous → logged-in), the
  assignment may change.
- **Forced decisions are per-context.** Across multiple user-
  contexts in the same test, you may need to re-force.
- **Doesn't test Optimizely's results analysis.** Platform-side
  statistics are separate.

## References

- Optimizely Python SDK:
  [docs.developers.optimizely.com/feature-experimentation/docs/python-sdk](https://docs.developers.optimizely.com/feature-experimentation/docs/python-sdk).
- Forced decisions:
  [docs.developers.optimizely.com/feature-experimentation/docs/forced-decision-methods](https://docs.developers.optimizely.com/feature-experimentation/docs/forced-decision-methods).
- Companion catalogs:
  `guardrail-metrics-reference`,
  `peeking-problem-reference`,
  `ab-test-validity-checklist`.
- Sibling SDKs:
  `statsig-test`,
  `vwo-test`,
  `amplitude-experiment-test`.
