# qa-secrets

Secrets scanning + rotation. Two per-tool scanner skills
(gitleaks - the OSS leader, with baseline management for legacy
findings as a reference - and TruffleHog, the high-precision live
validator) plus a build-an-X workflow skill for the **rotation step
that follows detection** (because git-history scrub does NOT fix a
leak - the secret IS exposed).

Covers the universal pre-commit + repo-history hygiene gap.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [gitleaks-scanning](skills/gitleaks-scanning/SKILL.md) | Go-based scanner; `gitleaks git/dir/stdin` (v8.19+); `.gitleaks.toml` rules + allowlists; pre-commit + GHA; baseline management for legacy-finding onboarding as a reference |
| Skill | [trufflehog-scanning](skills/trufflehog-scanning/SKILL.md) | Rust-based with **live verification** via provider API calls; multi-source (git/github/gitlab/filesystem/s3/docker/gcs/postman); `--results=verified` filter |
| Skill | [secrets-rotation-runner](skills/secrets-rotation-runner/SKILL.md) | Build-an-X for rotation workflow after detection: identify provider → two-secret rotation → audit → invalidate → post-mortem → add detection rule |
| Agent | [secrets-finding-triager](agents/secrets-finding-triager.md) | Adversarial unifier of gitleaks + TruffleHog + Kingfisher JSON; dedupes by (file, line, secret-class); enforces waivers with `expires:` + `approved_by:` + `reason:`; emits BLOCK/PASS verdict |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-secrets@testland-qa
```
