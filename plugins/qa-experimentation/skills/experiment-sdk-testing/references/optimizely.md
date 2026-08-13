# Optimizely SDK testing

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

## How to use

1. Install the Optimizely SDK for your language (`pip install optimizely-sdk`, or the npm package).
2. Export the datafile from the Optimizely UI or API and commit it as a fixture under `tests/fixtures/`.
3. Initialize the client offline from that datafile - no SDK key, no network call.
4. Create an `OptimizelyUserContext` per test with the attributes the audience targeting needs.
5. Verify: assert the fixture drives a real decision - `user.decide("new_checkout_flow").enabled is True` - before pinning arms. If it fails, the datafile is stale or missing the flag; re-export it and re-run.
6. Pin arms with `set_forced_decision` where a test needs a fixed variation, then call `decide` (one flag) or `decide_all` (all flags).
7. Assert on `variation_key` / `enabled` (never variation IDs); add assignment-integrity and event-tracking checks via the notification listener (see [optimizely-recipes.md](optimizely-recipes.md)).
8. Run under pytest in CI; re-export the datafile periodically to catch drift against prod config.

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

Extended recipes - assignment-integrity and event-tracking tests, the pytest run command, and CI integration yaml - are in [optimizely-recipes.md](optimizely-recipes.md).

## Worked example

The team ships a `new_checkout_flow` flag with a `treatment_a`
variation, and QA needs a deterministic test that a premium-plan
user is routed into the treatment. Follow the How-to-use steps:
export the fixture, init offline, create the `{"plan": "premium"}`
context, assert `decide("new_checkout_flow")` returns `enabled is
True` / `variation_key == "treatment_a"`, then pin the arm with
`set_forced_decision` for the variant-specific path.

Result: a deterministic pass/fail on the checkout-routing logic
with no network round-trip and no SDK key - the fixture drives
the whole decision.

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
- Companion: `ab-test-validity-checklist`; result-trust references (peeking, guardrails) live in `experiment-results-interpreter`.
- Sibling vendor references: [statsig.md](statsig.md), [split-io.md](split-io.md), [amplitude.md](amplitude.md), [vwo.md](vwo.md).
