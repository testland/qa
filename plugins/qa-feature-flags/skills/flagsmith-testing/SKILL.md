---
name: flagsmith-testing
description: "Wraps Flagsmith server-side SDK testing patterns: local-evaluation mode (no API calls), offline mode with LocalFileHandler + downloaded environment.json, default_flag_handler for per-feature mocked fallbacks, and the get_environment_flags / get_identity_flags evaluation paths. Use when writing tests for code using Flagsmith. Composes feature-flag-test-matrix-reference."
---

# flagsmith-testing

## Overview

Flagsmith (open-source, also SaaS at flagsmith.com) supports
three test-friendly modes per
[docs.flagsmith.com/clients/server-side](https://docs.flagsmith.com/clients/server-side):

1. **Local-evaluation mode** - fetches environment + flags
   periodically, evaluates locally without per-request network.
2. **Offline mode with LocalFileHandler** - loads a downloaded
   `environment.json` snapshot; zero network.
3. **Default flag handler** - programmatic fallback for any
   flag (mock-flag-only mode).

## When to use

- Tests for code using Flagsmith flags.
- Fully-offline CI without Flagsmith network access.
- Mocking specific flag values via `default_flag_handler`.

## Authoring

### Install

```bash
pip install flagsmith
npm install --save-dev flagsmith-nodejs
```

### Offline mode with LocalFileHandler

Per [docs.flagsmith.com](https://docs.flagsmith.com/clients/server-side):

```python
from flagsmith import Flagsmith
from flagsmith.offline_handlers import LocalFileHandler

local_file_handler = LocalFileHandler(environment_document_path="tests/fixtures/flagsmith-environment.json")

flagsmith = Flagsmith(offline_mode=True, offline_handler=local_file_handler)
```

The `environment.json` is downloadable via the Flagsmith CLI:

```bash
flagsmith environment-document --api-key=<server-key> --output=tests/fixtures/flagsmith-environment.json
```

Commit the fixture; refresh deliberately.

### Local-evaluation mode

```python
flagsmith = Flagsmith(
    environment_key="server-key",
    enable_local_evaluation=True,
    environment_refresh_interval_seconds=60,
)
```

Local mode polls; offline mode doesn't. For tests, offline is
usually preferred.

### default_flag_handler - per-flag mock

```python
from flagsmith import Flagsmith
from flagsmith.models import DefaultFlag

def default_flag_handler(feature_name: str) -> DefaultFlag:
    if feature_name == "secret_button":
        return DefaultFlag(enabled=False, value='{"colour": "#b8b8b8"}')
    return DefaultFlag(enabled=False, value=None)

flagsmith = Flagsmith(
    environment_key="test-key",
    default_flag_handler=default_flag_handler,
)
```

Useful when the offline environment.json doesn't have the flag
you're testing yet.

### Evaluate flags

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

### Integrity tests

```python
def test_same_identity_consistent():
    f1 = flagsmith.get_identity_flags("u1")
    f2 = flagsmith.get_identity_flags("u1")
    assert f1.is_feature_enabled("flag-x") == f2.is_feature_enabled("flag-x")
```

## Running

```bash
pytest tests/flagsmith/
```

## CI integration

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

No env vars needed in offline mode.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Production env_key in tests | Real API calls + analytics pollution | offline_mode + LocalFileHandler |
| environment.json not committed | Test flakes when prod changes | Commit; refresh deliberately |
| Mixing offline_mode + local_evaluation_mode | Conflicting; one takes precedence | Pick one |
| default_flag_handler returns DefaultFlag with no value | Tests for value-based flags fail silently | Always set `value` |
| Skipping `flagsmith.get_identity_flags` for identity-scoped tests | Bypasses per-user logic | Use identity API |
| Per-test new Flagsmith client | Slow init | Session-scoped fixture |

## Limitations

- **environment.json is point-in-time.** Drift invisible.
- **default_flag_handler only fires for missing flags** in
  local-eval mode. In offline mode it can be used for fallback.
- **No granular per-user override API.** Use traits +
  segments via the environment.json.
- **Doesn't validate Flagsmith's own logic.** Platform-side
  evaluation is separate.

## References

- Flagsmith server-side docs:
  [docs.flagsmith.com/clients/server-side](https://docs.flagsmith.com/clients/server-side).
- Offline-mode guide:
  [docs.flagsmith.com/clients/server-side#offline-mode](https://docs.flagsmith.com/clients/server-side).
- Companion:
  [`feature-flag-test-matrix-reference`](../feature-flag-test-matrix-reference/SKILL.md).
- Sibling SDKs:
  [`launchdarkly-testing`](../launchdarkly-testing/SKILL.md),
  [`unleash-testing`](../unleash-testing/SKILL.md),
  [`growthbook-testing`](../growthbook-testing/SKILL.md).
