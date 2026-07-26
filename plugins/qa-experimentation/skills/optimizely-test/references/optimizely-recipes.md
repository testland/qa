# optimizely-test extended recipes

Deeper test recipes for the `optimizely-test` skill. The SKILL.md spine
covers install, datafile init, user context + `decide`, and forced
decisions; this file holds the assignment-integrity and event-tracking
tests plus the run/CI wiring.

## Assignment integrity

Same user id must resolve to the same variation, and `decide_all` must
return a stable key set across calls.

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

## Event tracking

Assert conversion events via the notification listener rather than
inspecting network calls.

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
