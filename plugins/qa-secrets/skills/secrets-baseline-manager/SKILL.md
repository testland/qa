---
name: secrets-baseline-manager
description: "Builds and maintains a unified secrets baseline/allowlist across gitleaks (.gitleaksignore + --baseline-path), TruffleHog (--results=verified filter + trufflehog:ignore), and Kingfisher (--baseline-file + --exclude/--skip-* flags); adopts legacy findings without blocking PRs; enforces a waiver lifecycle (expires + approved_by + reason) stored in .secrets-waivers.yaml; prevents baseline rot via quarterly audit + expiry enforcement. Use when onboarding secrets scanning onto a repo that already has historical findings, or when per-scanner ignore configs have drifted out of sync and need consolidating into one governed allowlist."
---

# secrets-baseline-manager

[gl]: https://github.com/gitleaks/gitleaks
[th]: https://github.com/trufflesecurity/trufflehog
[kf]: https://github.com/mongodb/kingfisher

**Scope:** Each of the three OSS secret scanners ships its own suppression
mechanism. Left uncoordinated, they drift - a finding suppressed in gitleaks
still fires in TruffleHog, or an expired waiver stays live indefinitely.
This skill builds a unified baseline strategy: one human-facing waiver file
(`.secrets-waivers.yaml`) that drives per-scanner config, a defined waiver
lifecycle, and a quarterly audit cadence to prevent baseline rot.

Complementary skills:
`gitleaks-scanning`,
`trufflehog-scanning`,
`kingfisher-scanning`.
After adopting a baseline, the finding-triage step
applies `.secrets-waivers.yaml` at verdict time.

## When to use

- Onboarding secrets scanning onto a repo that already has historical
  findings - unblock PRs immediately without ignoring the debt.
- Per-scanner ignore configs (`.gitleaksignore`, `.gitleaks.toml`
  allowlists, the Kingfisher baseline, `trufflehog:ignore`) have drifted
  out of sync and need consolidating into one governed allowlist.
- A finding suppressed in one scanner still fires in another ("fixed in
  gitleaks, still fails TruffleHog").
- Auditing an existing baseline for rot - expired or unreviewed waivers
  accumulating with no audit trail.

## How to use

1. **Map each active scanner's suppression model** - baseline snapshot vs
   config allowlist vs inline comment - from the per-scanner tables in
   Step 1.
2. **Snapshot the repo's current findings** per scanner, commit `.secrets/`,
   and apply each snapshot in CI so only new findings fail the build
   (Step 2a-2b).
3. **Record every baselined finding as a waiver** in `.secrets-waivers.yaml`
   with its mandatory `expires` / `approved_by` / `reason` fields, so the
   suppression carries an audit trail (Step 2c).
4. **Apply path- and value-based suppressions in all three scanners
   together** so a finding suppressed in one does not re-fire in another
   (Step 3).
5. **Enforce the waiver lifecycle and run the rot audit on a schedule** -
   approval tiers, expiry windows, renewal, and the quarterly audit script:
   [references/waiver-lifecycle.md](references/waiver-lifecycle.md) and
   [references/baseline-rot-prevention.md](references/baseline-rot-prevention.md).

---

## Step 1 - Understand each scanner's suppression model

Before wiring configs, map the suppression surface for each active scanner.

### Gitleaks (per [gl][gl])

Three layers, from broadest to narrowest:

| Layer | Mechanism | Config location |
|---|---|---|
| Baseline snapshot | `--baseline-path gitleaks-baseline.json` | CI flag |
| Config allowlist (all rules) | `[[allowlists]]` block | `.gitleaks.toml` |
| Config allowlist (one rule) | `[[rules.allowlists]]` block | `.gitleaks.toml` |
| Fingerprint suppress | `.gitleaksignore` (one fingerprint per line) | repo root |
| Inline suppress | `# gitleaks:allow` comment | source file |

Per [gl][gl], `[[allowlists]]` supports: `commits` (list of SHA hashes),
`paths` (regex), `regexes` (secret-value pattern), `stopwords` (keyword
match), and `regexTarget` (`"match"` or `"line"`). Multiple allowlist blocks
per rule are allowed; within a block the default condition is `OR` (any
criterion satisfied); set `condition = "AND"` to require all criteria.

Per [gl][gl], `.gitleaksignore` is marked experimental and works by exact
`Fingerprint` value from the scan JSON output.

### TruffleHog (per [th][th])

TruffleHog's primary suppression lever is output filtering, not path
exclusion:

| Layer | Mechanism | How |
|---|---|---|
| Output filter | `--results=verified` | Show only API-confirmed secrets |
| Detector skip | `--exclude-detectors=TYPE` | Drop noisy detector class |
| Inline suppress | `trufflehog:ignore` comment on the finding line | Source file |

Per [th][th], `--results` accepts `verified`, `unverified`, `unknown`, and
`filtered_unverified`; the default is `verified,unverified,unknown`. For CI
gating, `--results=verified` is the lowest-noise setting - it blocks only
on credentials confirmed active via API call.

TruffleHog does not ship a dedicated baseline-snapshot file or a
path-exclusion flag analogous to gitleaks. The practical cross-tool
baseline equivalent is: gate CI on `--results=verified` and document any
remaining unverified findings as waivers in `.secrets-waivers.yaml`.

### Kingfisher (per [kf][kf])

| Layer | Mechanism | How |
|---|---|---|
| Baseline snapshot | `--baseline-file baseline.yml` | YAML file, fingerprint-matched |
| Create/refresh baseline | `--manage-baseline --baseline-file baseline.yml` | Prunes stale + appends new |
| Path exclusion | `--exclude 'PATTERN'` | Regex; repeatable |
| Secret-value skip | `--skip-regex 'PATTERN'` | Regex on extracted secret |
| Keyword skip | `--skip-word WORD` | Substring match |
| AWS canary skip | `--skip-aws-account "ID1,ID2"` | By AWS account ID |
| Inline suppress | `kingfisher:ignore` comment | Source file |

Per [kf][kf], the Kingfisher baseline file (`--baseline-file`) uses YAML
with an `ExactFindings.matches` list. Each entry requires: `filepath`,
`fingerprint` (64-bit decimal fingerprint), `linenum`, and `lastupdated`.
The fingerprint is computed from the secret value plus the normalized path,
so a secret that moves without changing value still matches the baseline.
Running `--manage-baseline` automatically prunes entries no longer present
in the repo.

---

## Step 2 - Adopt a baseline for a repo with legacy findings

Use this workflow when enabling scanning on a repo that already has findings.
The goal: unblock PRs immediately while creating an auditable record of
accepted debt.

### 2a - Generate per-scanner snapshots

```bash
# Gitleaks - full history snapshot
gitleaks git --report-format json --report-path .secrets/gitleaks-baseline.json

# TruffleHog - verified-only snapshot (saves findings to JSON for triager)
trufflehog git file://. --results=verified,unverified,unknown \
  --json 2>/dev/null > .secrets/trufflehog-baseline.json

# Kingfisher - baseline file from current HEAD
kingfisher scan . --confidence low \
  --manage-baseline --baseline-file .secrets/kingfisher-baseline.yml
```

Commit `.secrets/` to the repo. CI will now diff against this state.

### 2b - Apply baselines in CI

```bash
# Gitleaks (only new findings fail the build)
gitleaks git --baseline-path .secrets/gitleaks-baseline.json \
  --report-format json --report-path leaks.json

# TruffleHog (verified-only gate; unverified tracked separately)
trufflehog git file://. --results=verified --json 2>/dev/null > trufflehog.json

# Kingfisher (suppresses all baselined findings)
kingfisher scan . --baseline-file .secrets/kingfisher-baseline.yml \
  --format json > kingfisher.json
```

### 2c - Populate `.secrets-waivers.yaml` from the snapshot

Every finding in the baseline snapshots must have a corresponding waiver
entry before the baseline is committed. This creates the paper trail that
prevents baselines from silently accumulating unreviewed debt.

Waiver entry format (mandatory fields; extras allowed):

```yaml
waivers:
  - id: gl-aws-1                         # unique, human-readable
    scanner: gitleaks
    fingerprint: "abc123def456..."        # from Fingerprint field in leaks.json
    rule: "aws-access-token"
    file: "scripts/seed.sh"
    reason: >
      Dummy AWS key used in SDK unit tests; never deployed.
      No access has ever been provisioned for this key ID.
    approved_by: "alice@example.com"
    expires: "2026-12-31"
    created: "2026-06-04"

  - id: th-stripe-1
    scanner: trufflehog
    secret_class: "Stripe"
    file: "tests/fixtures/stripe-mock.json"
    reason: >
      Stripe publishable key from Stripe's own test-mode fixture set;
      not a live key. Validated against Stripe docs.
    approved_by: "bob@example.com"
    expires: "2026-12-31"
    created: "2026-06-04"

  - id: kf-gh-pat-1
    scanner: kingfisher
    fingerprint: "12345678901234567"      # decimal u64 from baseline.yml
    file: "docs/examples/auth-sample.md"
    reason: >
      Example PAT in documentation; revoked immediately after publishing.
      Pattern retained in docs as negative example.
    approved_by: "carol@example.com"
    expires: "2027-03-01"
    created: "2026-06-04"
```

The finding-triage step validates all three mandatory fields
(`expires`, `approved_by`, `reason`) at verdict time and rejects malformed
or expired waivers, keeping the finding active.

---

## Step 3 - Cross-tool consistency rules

Because each scanner uses a different suppression mechanism, apply
suppressions at two levels simultaneously to prevent "fixed in one scanner,
still fires in another" drift.

### Path-based suppressions

When a path is always safe (vendor/, test fixtures, generated code), suppress
it in all three scanners:

```toml
# .gitleaks.toml - global allowlist
[[allowlists]]
description = "vendor and generated code - safe in all scanners"
paths = ['''vendor/.*''', '''generated/.*''', '''tests/fixtures/.*\.json$''']
```

```bash
# kingfisher CLI (in CI command)
kingfisher scan . \
  --exclude 'vendor/' \
  --exclude 'generated/' \
  --exclude 'tests/fixtures/.*\.json' \
  --baseline-file .secrets/kingfisher-baseline.yml \
  --format json > kingfisher.json
```

TruffleHog does not ship a path-exclusion flag (per [th][th]); use
`trufflehog:ignore` comments in files where inline suppression is feasible,
or gate TruffleHog on `--results=verified` to reduce path-level false
positives.

### Value-based suppressions (known test patterns)

```toml
# .gitleaks.toml - stopwords suppress known dummy values
[[allowlists]]
description = "known test-key patterns"
stopwords = ['''EXAMPLEKEY''', '''DUMMYSECRET''', '''REPLACE_ME''']
```

```bash
# Kingfisher equivalent
kingfisher scan . \
  --skip-regex '(?i)(EXAMPLEKEY|DUMMYSECRET|REPLACE_ME)' \
  --baseline-file .secrets/kingfisher-baseline.yml
```

```bash
# TruffleHog - exclude known test-dummy detector class
trufflehog git file://. --results=verified \
  --exclude-detectors=generic
```

### Fingerprint suppressions for one-off exceptions

When a single known finding cannot be suppressed by path or value pattern:

```bash
# Gitleaks: add Fingerprint value to .gitleaksignore (one per line)
echo "abc123:gitleaks-rule-id:path/to/file.go:42" >> .gitleaksignore

# Kingfisher: re-run --manage-baseline to add to baseline.yml
kingfisher scan . --confidence low \
  --manage-baseline --baseline-file .secrets/kingfisher-baseline.yml

# TruffleHog: add trufflehog:ignore comment at the offending line
# (only if the source file is in a writable location)
```

---

## Ongoing governance - deep references

Once the baseline is adopted, two disciplines keep it honest. Both live in
companion references so this file stays a decision surface:

- **Waiver lifecycle** - approval authority per risk tier, expiry windows,
  and the renewal process before a waiver lapses:
  [references/waiver-lifecycle.md](references/waiver-lifecycle.md).
- **Preventing baseline rot** - the quarterly audit script, Kingfisher
  stale-entry pruning, and gitleaks baseline refresh cadence:
  [references/baseline-rot-prevention.md](references/baseline-rot-prevention.md).

---

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Baseline with no waiver file | Findings are suppressed with no audit trail | Pair every baseline entry with a `.secrets-waivers.yaml` entry (Step 2c) |
| Waiver without `expires:` | Permanent suppression; rot guaranteed | Mandatory expiry on every entry (see [references/waiver-lifecycle.md](references/waiver-lifecycle.md)) |
| TruffleHog `--results=unverified` in CI gate | Blocks on entropy noise; team disables scanner | Gate on `--results=verified`; track unverified in waiver file |
| Gitleaks `--baseline-path` only, no `[[allowlists]]` | Kingfisher still fires on same path-based FPs | Apply path suppressions in all three scanners (Step 3) |
| Regenerate Kingfisher baseline without `--manage-baseline` | Manual edits to baseline.yml break fingerprint format | Always use `--manage-baseline` flag (per [kf][kf]) |
| Waiver approved by the finder | No second pair of eyes | Require a distinct approver (see [references/waiver-lifecycle.md](references/waiver-lifecycle.md)) |

## Limitations

- TruffleHog has no path-exclusion flag and no baseline-snapshot file (per
  [th][th]). Cross-tool path parity requires inline `trufflehog:ignore`
  comments or accepting some TruffleHog-only noise controlled via
  `--results=verified`.
- Gitleaks `.gitleaksignore` is marked experimental (per [gl][gl]);
  prefer `[[allowlists]]` in `.gitleaks.toml` for production suppressions.
- Kingfisher baseline fingerprints use the secret value + normalized path
  (per [kf][kf]); a renamed file retains its suppression, but a changed
  secret value creates a new fingerprint and re-fires.
- `.secrets-waivers.yaml` is a governance layer only; the finding-triage
  step reads it at verdict time - it does not automatically
  update per-scanner config files. Sync per-scanner config (Step 3) and
  the waiver file together.

## References

- [gl][gl] - gitleaks: install, commands, `--baseline-path`, `.gitleaksignore`,
  `[[allowlists]]` config
- [th][th] - TruffleHog: `--results` filter, `trufflehog:ignore`,
  `--exclude-detectors`
- [kf][kf] - Kingfisher: `--baseline-file`, `--manage-baseline`,
  `--exclude`, `--skip-regex`, `--skip-word`, `docs/BASELINE.md`
- Deep references (with their own citations): waiver lifecycle in
  [references/waiver-lifecycle.md](references/waiver-lifecycle.md); baseline
  rot prevention in
  [references/baseline-rot-prevention.md](references/baseline-rot-prevention.md).
- `gitleaks-scanning` - per-scanner
  gitleaks workflow
- `trufflehog-scanning` - per-scanner
  TruffleHog workflow
- `kingfisher-scanning` - per-scanner
  Kingfisher workflow
