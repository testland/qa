# Flagsmith SDK testing

Wraps Flagsmith server-side SDK testing patterns so tests run without calling
the Flagsmith API: offline mode with LocalFileHandler + a downloaded
environment.json snapshot, local-evaluation mode (no per-request network),
and default_flag_handler for per-feature mocked fallbacks, via the
get_environment_flags / get_identity_flags evaluation paths.

Flagsmith (open-source, also SaaS at flagsmith.com) supports
three test-friendly modes per
[docs.flagsmith.com/clients/server-side](https://docs.flagsmith.com/clients/server-side):

1. **Offline mode with LocalFileHandler** - loads a downloaded
   `environment.json` snapshot; zero network.
2. **Local-evaluation mode** - fetches environment + flags
   periodically, evaluates locally without per-request network.
3. **Default flag handler** - programmatic fallback for any
   flag (mock-flag-only mode).

Offline mode is the default choice for tests; local-evaluation
and `default_flag_handler` detail live in
[flagsmith-modes.md](flagsmith-modes.md).

## How to use

1. Install the SDK: `pip install flagsmith` (Python) or `npm install --save-dev flagsmith-nodejs` (Node).
2. Download the environment snapshot with the Flagsmith CLI (command below) and commit it as a test fixture.
3. Construct the client in offline mode with `LocalFileHandler` pointed at that fixture, so tests make zero network calls.
4. For flags not yet in the snapshot, register a `default_flag_handler` returning a `DefaultFlag` with the value under test (see [flagsmith-modes.md](flagsmith-modes.md)).
5. Evaluate via `get_environment_flags()` for environment-scoped flags, or `get_identity_flags(identifier, traits=...)` for per-user flags.
6. Assert on `is_feature_enabled(...)` and `get_feature_value(...)`, and add an integrity test that the same identity resolves consistently.
7. Verify: with `offline_mode=True` and no `environment_key` set, `get_environment_flags()` must return the fixture's flags with zero network calls (run the suite with the machine offline or under a network-blocking fixture to confirm). If it raises or attempts an API call, the `LocalFileHandler` `environment_document_path` is wrong or `offline_mode` is unset - fix the path and re-run.
8. Wire `pytest tests/flagsmith/` into CI - offline mode needs no env vars.

## Offline mode with LocalFileHandler

Per [docs.flagsmith.com](https://docs.flagsmith.com/clients/server-side):

```python
from flagsmith import Flagsmith
from flagsmith.offline_handlers import LocalFileHandler

local_file_handler = LocalFileHandler(environment_document_path="tests/fixtures/flagsmith-environment.json")

flagsmith = Flagsmith(offline_mode=True, offline_handler=local_file_handler)
```

Download the `environment.json` via the Flagsmith CLI, then commit it (refresh deliberately):

```bash
flagsmith environment-document --api-key=<server-key> --output=tests/fixtures/flagsmith-environment.json
```

## Evaluate flags

```python
def test_environment_flag():
    flags = flagsmith.get_environment_flags()
    assert flags.is_feature_enabled("secret_button") is False
    assert flags.get_feature_value("secret_button") == '{"colour": "#b8b8b8"}'

def test_identity_flag():
    flags = flagsmith.get_identity_flags(
        identifier="user@example.com",
        traits={"plan": "premium"},
    )
    assert flags.is_feature_enabled("premium_feature") is True
```

Integrity test - the same identity must resolve consistently:

```python
def test_same_identity_consistent():
    f1 = flagsmith.get_identity_flags("u1")
    f2 = flagsmith.get_identity_flags("u1")
    assert f1.is_feature_enabled("flag-x") == f2.is_feature_enabled("flag-x")
```

## CI integration

No env vars needed in offline mode:

```yaml
jobs:
  flagsmith-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
      - run: pip install flagsmith
      - run: pytest tests/flagsmith/
```

## Worked example

A service reads a `secret_button` flag (boolean plus a JSON colour value) and a `premium_feature` flag gated on a `plan` trait, tested fully offline:

1. Download the environment document and commit it (step 2 above).
2. Build the offline client with `LocalFileHandler` (offline-mode snippet above).
3. `secret_button` is not in the snapshot yet, so register a `default_flag_handler` for it (see [flagsmith-modes.md](flagsmith-modes.md)).
4. Assert on `get_environment_flags()` and `get_identity_flags(...)` (evaluate snippet above).

Result: `pytest tests/flagsmith/` runs green in CI with zero network access and no analytics pollution.

## Sources

- Flagsmith server-side docs:
  [docs.flagsmith.com/clients/server-side](https://docs.flagsmith.com/clients/server-side).
- Local-evaluation mode, `default_flag_handler`, anti-patterns, and limitations:
  [flagsmith-modes.md](flagsmith-modes.md).
