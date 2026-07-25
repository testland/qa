# Preventing baseline rot

Deep reference for the `secrets-baseline-manager` skill - the three mechanisms
that stop suppressed findings from accumulating over time with no review.

[gl]: https://github.com/gitleaks/gitleaks
[kf]: https://github.com/mongodb/kingfisher

## Quarterly audit script

Run at the start of each quarter (or automate in CI on a schedule):

```bash
#!/usr/bin/env bash
# audit-waivers.sh - flag expired or near-expiry waivers
TODAY=$(date +%Y-%m-%d)
WARN_DAYS=30

python3 - <<'EOF'
import yaml, sys
from datetime import date, timedelta

with open('.secrets-waivers.yaml') as f:
    waivers = yaml.safe_load(f).get('waivers', [])

today = date.today()
warn_cutoff = today + timedelta(days=30)
issues = []

for w in waivers:
    exp = date.fromisoformat(w.get('expires', '1970-01-01'))
    if exp < today:
        issues.append(f"EXPIRED   {w['id']} ({w['file']}) - expired {exp}")
    elif exp <= warn_cutoff:
        issues.append(f"NEAR-EXPIRY {w['id']} ({w['file']}) - expires {exp}")

if issues:
    for i in issues: print(i)
    sys.exit(1)
print(f"All {len(waivers)} waivers valid.")
EOF
```

## Kingfisher stale-entry pruning

Per [kf][kf], running `--manage-baseline` automatically removes entries no
longer present in the repo. Schedule this in CI after each merge to main:

```bash
kingfisher scan . --confidence low \
  --manage-baseline --baseline-file .secrets/kingfisher-baseline.yml
git diff --quiet .secrets/kingfisher-baseline.yml \
  || git commit -m "chore: prune stale kingfisher baseline entries"
```

## Gitleaks baseline refresh cadence

Per [gl][gl], `--baseline-path` only filters findings that match the
baseline JSON by fingerprint. Old baseline entries for rotated secrets do
not cause false negatives - they simply have no effect. However,
accumulated stale entries obscure the true size of accepted debt.
Regenerate the baseline after each bulk rotation:

```bash
gitleaks git --report-format json \
  --report-path .secrets/gitleaks-baseline.json
```

## Sources

- [gl][gl] - gitleaks: `--baseline-path`, `.gitleaksignore`, `[[allowlists]]`.
- [kf][kf] - Kingfisher: `--baseline-file`, `--manage-baseline`.
