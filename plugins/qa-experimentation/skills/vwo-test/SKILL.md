---
name: vwo-test
description: "Wraps VWO (Visual Website Optimizer) SDK testing patterns: SDK initialization with the settings file (offline-capable), `getFeatureVariableValue` and `activate` API, force-bucketing for per-test assignment, and assignment-integrity tests against the bucketing algorithm. Use when writing tests for VWO-instrumented application code."
---

# vwo-test

## Overview

The VWO (Visual Website Optimizer) server-side SDK uses a
**settings file** (equivalent to Optimizely's datafile) for
offline-capable testing. Per
[developers.vwo.com](https://developers.vwo.com/), the SDK
supports multiple languages with a common API: `activate`,
`get_feature_variable_value`, `is_feature_enabled`, `track`,
`push`.

## When to use

- Tests for code that reads a VWO feature variable / experiment.
- Force-bucketing for per-test assignment pinning.
- Assignment-integrity tests per
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
  Step 3.

## Authoring

### Install

```bash
pip install vwo-python-sdk
npm install --save-dev vwo-node-sdk
```

### Settings-file-based init

```python
import json
import vwo

with open("tests/fixtures/vwo-settings.json") as f:
    settings = json.load(f)

client = vwo.launch(settings, is_development_mode=True)
```

`is_development_mode=True` disables event tracking to VWO
servers - fully-offline tests.

### Activate an experiment / variation

```python
def test_get_variation_for_user():
    variation_name = client.activate("checkout-experiment", "user-1")
    assert variation_name in ("Control", "Variation-1")
```

### Feature variable

```python
def test_feature_variable_value():
    value = client.get_feature_variable_value("checkout-experiment", "button_color", "user-1")
    assert value in ("blue", "green")
```

### Force-bucket a user

VWO doesn't have a direct "force decision" API like Optimizely;
the canonical approach is to construct user IDs that hash into
specific buckets - or use the SDK's `userPreSegment` callback
where supported.

Per VWO docs, the bucketing is **deterministic on the user ID**.
Tests rely on this:

```python
def test_specific_user_id_in_treatment():
    # User IDs are bucketed deterministically; pre-compute and pin
    KNOWN_TREATMENT_USER = "test-user-treatment-12345"
    variation = client.activate("checkout-experiment", KNOWN_TREATMENT_USER)
    assert variation == "Variation-1"
```

A pre-test step generates user IDs and records their bucket
assignments in a fixture; tests reference the fixture.

### Assignment integrity tests

```python
def test_same_user_always_same_variation():
    v1 = client.activate("expt", "user-1")
    v2 = client.activate("expt", "user-1")
    assert v1 == v2

def test_bucketing_is_uniform():
    counts = {"Control": 0, "Variation-1": 0}
    for i in range(10000):
        v = client.activate("expt", f"user-{i}")
        if v: counts[v] += 1
    # 50/50 split → within a few percent
    ratio = counts["Variation-1"] / sum(counts.values())
    assert 0.48 < ratio < 0.52
```

The bucketing-uniformity test is **also a unit-level SRM check**
per [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md)
Step 2.

### Event tracking

```python
def test_conversion_tracked():
    client.activate("expt", "user-1")
    success = client.track("expt", "user-1", "checkout_completed")
    assert success
```

## Running

```bash
pytest tests/vwo/
```

## CI integration

```yaml
jobs:
  vwo-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
      - run: pip install vwo-python-sdk
      - run: pytest tests/vwo/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Live-mode tests with real account | Pollutes prod analytics | `is_development_mode=True` |
| Settings-file not committed | Tests flake on schema changes | Commit fixture; refresh deliberately |
| User IDs that hash into one bucket only | False sense of "covering both arms" | Verify via bucketing-uniformity test |
| Skipping conversion-tracking test | Track-event regressions silent | Test track() success |
| Different settings files in dev vs CI | Behaviour diverges | Single fixture |
| Tests not isolated per experiment | Cross-experiment bucketing leak | Per-test client teardown |

## Limitations

- **No direct force-decision API.** Must rely on deterministic
  bucketing or modify the user pre-segmentation.
- **Settings file is point-in-time.** Drift between fixture +
  prod invisible.
- **Bucketing-uniformity tests need many user IDs.** Below 1000
  iterations the variance dominates.
- **Event tracking is fire-and-forget in offline mode.** Can't
  assert delivery; only the local-call success.

## References

- VWO Python SDK:
  [github.com/wingify/vwo-python-sdk](https://github.com/wingify/vwo-python-sdk).
- VWO developer docs:
  [developers.vwo.com](https://developers.vwo.com/).
- Companion catalogs:
  [`guardrail-metrics-reference`](../guardrail-metrics-reference/SKILL.md),
  [`peeking-problem-reference`](../peeking-problem-reference/SKILL.md),
  [`ab-test-validity-checklist`](../ab-test-validity-checklist/SKILL.md).
- Sibling SDKs:
  [`statsig-test`](../statsig-test/SKILL.md),
  [`optimizely-test`](../optimizely-test/SKILL.md),
  [`amplitude-experiment-test`](../amplitude-experiment-test/SKILL.md).
