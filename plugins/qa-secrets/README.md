# qa-secrets

Secrets scanning + rotation. Three per-tool scanner skills
(gitleaks, TruffleHog, Kingfisher - covering the OSS leader, the
high-precision validator, and the modern Rust + 950-rule alternative)
plus a build-an-X workflow skill for the **rotation step that
follows detection** (because git-history scrub does NOT fix a leak - 
the secret IS exposed).

Covers the universal pre-commit + repo-history hygiene gap.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [gitleaks-scanning](skills/gitleaks-scanning/SKILL.md) | Go-based scanner; `gitleaks git/dir/stdin` (v8.19+); `.gitleaks.toml` rules + allowlists; pre-commit + GHA + baseline |
| Skill | [trufflehog-scanning](skills/trufflehog-scanning/SKILL.md) | Rust-based with **live verification** via provider API calls; multi-source (git/github/gitlab/filesystem/s3/docker/gcs/postman); `--results=verified` filter |
| Skill | [kingfisher-scanning](skills/kingfisher-scanning/SKILL.md) | MongoDB-built Rust scanner with Intel Hyperscan + 950 rules + live validation + checksum verification + cloud access mapping |
| Skill | [secrets-rotation-runner](skills/secrets-rotation-runner/SKILL.md) | Build-an-X for rotation workflow after detection: identify provider → two-secret rotation → audit → invalidate → post-mortem → add detection rule |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-secrets@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
