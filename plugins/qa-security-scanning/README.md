# qa-security-scanning

Unified security scanning: one plugin for the five scanner domains QA
teams gate CI on - SAST, DAST, SCA / dependency scanning, secrets, and
SBOM + container image scanning - plus one cross-domain adversarial
unifier agent (`security-finding-triager`) that combines any subset of
scanner output, deduplicates on the per-domain key, enforces waivers,
and emits a single PR-ready BLOCK / PASS verdict per domain (the IaC
scanners in [`qa-iac`](../qa-iac/) feed the same gate).

Every scanner skill includes a `## False-positive triage` section with
concrete suppression patterns + justification template + review
cadence. Security scanners without FP triage become shelf-ware.

## Components

### SAST

| Type | Name | Description |
| --- | --- | --- |
| Skill | [semgrep-rules](skills/semgrep-rules/SKILL.md) | Pattern-DSL multi-language SAST; registry rulesets + custom YAML; `semgrep ci` with baseline-diff for legacy adoption; SARIF/JSON/GitLab-SAST/JUnit output |
| Skill | [sonarqube-rules](skills/sonarqube-rules/SKILL.md) | Multi-language SAST + Quality Gate platform; new-code-period gating; persistent issue tracking; PR analysis (Developer+); REST API for automation |
| Skill | [codeql-queries](skills/codeql-queries/SKILL.md) | Semantic-database SAST with cross-file taint flows; `codeql database create/analyze`; query packs per language; GitHub Code Scanning native integration |
| Skill | [language-native-sast](skills/language-native-sast/SKILL.md) | The first-party "linter as SAST" family: Bandit (Python), gosec (Go), eslint-plugin-security + no-unsanitized (JS/TS), PMD Apex security ruleset (Salesforce) - shared adoption pattern with per-tool references |
| Skill | [multi-tool-finding-triage](skills/multi-tool-finding-triage/SKILL.md) | Merges two or more scanner reports into one gate: canonical Finding normalization, per-domain dedupe with `caught_by` consensus, waiver validation (`expires:` + `approved_by:` + `reason:`), `fail_on` verdict, severity-bucketed PR comment |

### DAST

| Type | Name | Description |
| --- | --- | --- |
| Skill | [zap-baseline](skills/zap-baseline/SKILL.md) | OWASP ZAP baseline (passive, PR-blocking-safe) + zap-full-scan companion (active, staging-only); rule customization TSV; authenticated-scan setup and layered scan cadence as references |
| Skill | [nuclei-dast](skills/nuclei-dast/SKILL.md) | Nuclei template-based HTTP scanning; JSONL output feeds security-finding-triager |

### SCA / dependency scanning

| Type | Name | Description |
| --- | --- | --- |
| Skill | [snyk-test](skills/snyk-test/SKILL.md) | Multi-mode commercial scanner (`snyk test` SCA + `snyk monitor` continuous tracking + companion `snyk code/container/iac` modes); `.snyk` policy file with mandatory `expires:` |
| Skill | [osv-scanner](skills/osv-scanner/SKILL.md) | Google's OSS scanner against OSV.dev; `osv-scanner scan -r ./` recursive; SBOM input; `osv-scanner.toml` config with `[[IgnoredVulns]] ignoreUntil` |
| Skill | [dependabot-config](skills/dependabot-config/SKILL.md) | GitHub-native `.github/dependabot.yml` reference: schedule, ignore, groups, allow, target-branch, auto-merge integration |
| Skill | [renovate-config](skills/renovate-config/SKILL.md) | Multi-platform `renovate.json` reference (GitHub/GitLab/Bitbucket/Azure DevOps/Gitea); presets, packageRules, vulnerabilityAlerts, automergeSchedule |
| Skill | [npm-pip-maven-audit](skills/npm-pip-maven-audit/SKILL.md) | Native package-manager audit commands: `npm audit`, `pip-audit`, `mvn dependency-check:check`, plus `cargo audit` (RustSec) and `bundle-audit` (ruby-advisory-db) with suppression-file + CI depth as references |
| Skill | [reachability-analyzer](skills/reachability-analyzer/SKILL.md) | Dead-dependency / reachability analysis (depcheck, vulture, cargo-machete) to downrank unreachable vuln dependencies |
| Skill | [cve-exploitability-triage](skills/cve-exploitability-triage/SKILL.md) | Ranks CVEs by exploitability rather than severity alone: EPSS probability, CISA KEV membership, OpenVEX status, reachability, then a four-bucket priority assignment; a KEV listing is never waivable |

### Secrets

| Type | Name | Description |
| --- | --- | --- |
| Skill | [gitleaks-scanning](skills/gitleaks-scanning/SKILL.md) | Go-based scanner; `gitleaks git/dir/stdin` (v8.19+); `.gitleaks.toml` rules + allowlists; pre-commit + GHA; baseline management for legacy-finding onboarding as a reference |
| Skill | [trufflehog-scanning](skills/trufflehog-scanning/SKILL.md) | Rust-based with **live verification** via provider API calls; multi-source (git/github/gitlab/filesystem/s3/docker/gcs/postman); `--results=verified` filter |
| Skill | [secrets-rotation-runner](skills/secrets-rotation-runner/SKILL.md) | Build-an-X for rotation workflow after detection: identify provider → two-secret rotation → audit → invalidate → post-mortem → add detection rule (git-history scrub does NOT fix a leak) |

### SBOM + container

| Type | Name | Description |
| --- | --- | --- |
| Skill | [syft-generation](skills/syft-generation/SKILL.md) | Anchore Syft SBOM generation (images, dirs, archives; CycloneDX/SPDX/Syft/GitHub-JSON output; cosign attestation) plus the paired Grype scan workflow and SBOM diffing as references |
| Skill | [sbom-formats](skills/sbom-formats/SKILL.md) | SBOM format reference + format choice: CycloneDX v1.6 primary (components, dependencies, services, embedded VEX, formulation, ML BOMs) with SPDX 2.3 + 3.0 as a reference (US Federal procurement) |
| Skill | [trivy-image](skills/trivy-image/SKILL.md) | Aqua Trivy all-in-one container scanner: vuln + secret + misconfig + license in one pass; `--ignore-unfixed` actionable filter; `.trivyignore` + VEX |
| Skill | [vex-author](skills/vex-author/SKILL.md) | Author and validate OpenVEX documents (not_affected justifications) that security-finding-triager consumes |

### Agent

| Type | Name | Description |
| --- | --- | --- |
| Agent | [security-finding-triager](agents/security-finding-triager.md) | Cross-domain adversarial unifier: normalizes + deduplicates any subset of SAST / DAST / secrets / SCA / container-SBOM / IaC scanner output on the per-domain key with `caught_by` consensus; waiver enforcement (`expires:` + `approved_by:` + `reason:` mandatory, CISA KEV never waivable); EPSS + KEV enrichment for CVE domains; refuses pass with unwaived critical findings, Verified secrets, or Fix-Now CVEs |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-security-scanning@testland-qa
```
