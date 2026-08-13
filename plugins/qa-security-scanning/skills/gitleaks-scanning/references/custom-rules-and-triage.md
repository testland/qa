# gitleaks custom rules and false-positive triage

[gl-gh]: https://github.com/gitleaks/gitleaks

Custom org-internal rules and the mandatory allowlist / baseline /
justification workflow. Referenced from Step 4 and Step 5 of the
gitleaks-scanning skill.

## Custom rule example

```toml
# .gitleaks.toml
[extend]
useDefault = true

[[rules]]
id = "internal-api-key"
description = "Internal API key (acme- prefix)"
regex = '''(?i)acme[_-]?api[_-]?key[_-]?[a-zA-Z0-9]{32}'''
secretGroup = 1
keywords = ["acme"]
tags = ["acme-internal"]

[[rules.allowlists]]
description = "Test fixtures"
paths = ['''tests/fixtures/.*\.json$''']

[[allowlists]]
description = "Project-wide allowlist (legacy commits)"
commits = ["abc1234", "def5678"]
paths = ['''vendor/.*''', '''third_party/.*''']
```

The `[extend] useDefault = true` keeps built-in rules; without it,
your custom rules replace the defaults entirely.

## False-positive triage (MANDATORY)

Suppression mechanisms in priority order:

| Mechanism | Where | When to use |
|---|---|---|
| `[[rules.allowlists]] paths` | `.gitleaks.toml` | Per-rule path exclusion (test fixtures, vendor) |
| `[[rules.allowlists]] commits` | `.gitleaks.toml` | Per-rule commit exclusion (historical false positive) |
| `[[allowlists]] paths` | `.gitleaks.toml` (top-level) | All-rule path exclusion |
| `--baseline-path` | CI flag | Legacy debt: only fail on NEW findings vs baseline |
| Inline `# gitleaks:allow` comment | Code | Single-line suppression |

**Baseline workflow (per [gl-gh][gl-gh]):**

```bash
# Create baseline
gitleaks git --report-path gitleaks-baseline.json

# Apply baseline (only new findings fail)
gitleaks git --baseline-path gitleaks-baseline.json --report-path findings.json
```

**Justification template (mandatory in `.gitleaks.toml`):**

```toml
[[rules.allowlists]]
description = """
Reason: tests/fixtures/* contains intentional dummy AWS credentials
        for SDK initialization tests; never used against real AWS.
Approved-by: alice@example.com
Re-review-date: 2026-09-15 (re-evaluate when SDK supports mock-mode injection)
"""
paths = ['''tests/fixtures/.*\.json$''']
```

Cadence: every quarter, audit `.gitleaks.toml` allowlist entries;
expired re-review-date entries removed.
