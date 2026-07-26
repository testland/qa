# Flagsmith test modes, anti-patterns, and limitations

Deeper detail for [flagsmith-testing](../SKILL.md). Offline mode
(covered in the skill spine) is the default for tests; the modes
below are secondary.

## Local-evaluation mode

Polls the Flagsmith API periodically and evaluates flags locally
between refreshes (no per-request network, but not zero network):

```python
flagsmith = Flagsmith(
    environment_key="server-key",
    enable_local_evaluation=True,
    environment_refresh_interval_seconds=60,
)
```

Local mode polls; offline mode does not. For tests, offline is
usually preferred.

## default_flag_handler - per-flag mock

Programmatic fallback used when the offline `environment.json`
does not have the flag under test yet:

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

Useful when the offline environment.json does not have the flag
you are testing yet.

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
