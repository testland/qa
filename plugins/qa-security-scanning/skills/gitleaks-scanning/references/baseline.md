# Baseline management - onboarding a repo with legacy findings

Companion reference for `gitleaks-scanning`. Consult when enabling secret
scanning on a repo that already has historical findings (unblock PRs without
ignoring the debt), or when per-scanner ignore configs have drifted out of
sync and need consolidating into one governed allowlist.

[gl]: https://github.com/gitleaks/gitleaks
[th]: https://github.com/trufflesecurity/trufflehog

## Suppression models per scanner

### Gitleaks (per [gl][gl])

From broadest to narrowest:

| Layer | Mechanism | Config location |
|---|---|---|
| Baseline snapshot | `--baseline-path gitleaks-baseline.json` | CI flag |
| Config allowlist (all rules) | `[[allowlists]]` block | `.gitleaks.toml` |
| Config allowlist (one rule) | `[[rules.allowlists]]` block | `.gitleaks.toml` |
| Fingerprint suppress | `.gitleaksignore` (one fingerprint per line) | repo root |
| Inline suppress | `# gitleaks:allow` comment | source file |

`[[allowlists]]` supports `commits` (SHA list), `paths` (regex), `regexes`
(secret-value pattern), `stopwords` (keyword match), and `regexTarget`
(`"match"` or `"line"`). Within a block the default condition is `OR`; set
`condition = "AND"` to require all criteria ([gl][gl]).

`.gitleaksignore` is marked experimental and matches by exact `Fingerprint`
value from the scan JSON output ([gl][gl]).

### TruffleHog (per [th][th])

TruffleHog's primary suppression lever is output filtering, not path
exclusion:

| Layer | Mechanism | How |
|---|---|---|
| Output filter | `--results=verified` | Show only API-confirmed secrets |
| Detector skip | `--exclude-detectors=TYPE` | Drop noisy detector class |
| Inline suppress | `trufflehog:ignore` comment on the finding line | Source file |

`--results` accepts `verified`, `unverified`, `unknown`, and
`filtered_unverified`; default is `verified,unverified,unknown` ([th][th]).
TruffleHog ships no baseline-snapshot file and no path-exclusion flag: the
practical baseline equivalent is gating CI on `--results=verified` and
recording remaining unverified findings as waivers.

## Adopting a baseline (legacy-onboarding workflow)

### 1 - Generate snapshots

```bash
# Gitleaks - full history snapshot
gitleaks git --report-format json --report-path .secrets/gitleaks-baseline.json

# TruffleHog - full snapshot for the triage record
trufflehog git file://. --results=verified,unverified,unknown \
  --json 2>/dev/null > .secrets/trufflehog-baseline.json
```

Commit `.secrets/` so CI diffs against this state.

### 2 - Apply baselines in CI

```bash
# Gitleaks: only NEW findings fail the build
gitleaks git --baseline-path .secrets/gitleaks-baseline.json \
  --report-format json --report-path leaks.json

# TruffleHog: verified-only gate; unverified tracked separately
trufflehog git file://. --results=verified --json 2>/dev/null > trufflehog.json
```

### 3 - Record every baselined finding as a waiver

Every finding in a committed baseline snapshot needs a waiver entry with
`expires` + `approved_by` + `reason` - the paper trail that stops baselines
from silently accumulating unreviewed debt. The waiver-file schema, approval
tiers, expiry windows, and verdict-time enforcement are owned by
`multi-tool-finding-triage` (its `references/waiver-schema.md`) -
do not maintain a parallel waiver format here.

## Cross-tool consistency

Suppress always-safe paths and known dummy values in both scanners together,
or a finding fixed in one keeps firing in the other:

```toml
# .gitleaks.toml - global allowlist
[[allowlists]]
description = "vendor and generated code"
paths = ['''vendor/.*''', '''generated/.*''', '''tests/fixtures/.*\.json$''']

[[allowlists]]
description = "known test-key patterns"
stopwords = ['''EXAMPLEKEY''', '''DUMMYSECRET''', '''REPLACE_ME''']
```

TruffleHog has no path-exclusion flag ([th][th]): use `trufflehog:ignore`
inline comments where feasible, or rely on the `--results=verified` gate.
One-off exceptions: append the `Fingerprint` value to `.gitleaksignore`
(one per line).

## Preventing baseline rot

- **Quarterly audit**: walk the waiver file each quarter; expired waivers are
  treated as if absent - the finding re-activates and blocks the next verdict
  (enforced by `multi-tool-finding-triage` at verdict time).
- **Baseline refresh**: `--baseline-path` filters by fingerprint, so stale
  entries for rotated secrets cause no false negatives - but they obscure the
  true size of accepted debt. Regenerate after each bulk rotation:

```bash
gitleaks git --report-format json --report-path .secrets/gitleaks-baseline.json
```

## Sources

- [gl][gl] - gitleaks: `--baseline-path`, `.gitleaksignore`, `[[allowlists]]`
- [th][th] - TruffleHog: `--results` filter, `trufflehog:ignore`,
  `--exclude-detectors`
- `multi-tool-finding-triage` - waiver schema + verdict-time
  enforcement
