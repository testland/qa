# qa-sca

SCA (Software Composition Analysis) - dependency scanning + update
orchestration. Three per-tool scanner skills (Snyk, OSV-Scanner,
native package-manager audit) plus two reference skills for the
update-orchestration tools (Dependabot, Renovate) plus an
adversarial prioritizer agent that combines CVSS + EPSS + CISA KEV
+ reachability heuristic into a Fix-Now / Fix-This-Sprint /
Fix-Backlog / Accept-Risk bucket.

Sister to [`qa-sast`](../qa-sast/) (code security) and
[`qa-dast`](../qa-dast/) (runtime security) - qa-sca covers
third-party dependency security.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [snyk-test](skills/snyk-test/SKILL.md) | Multi-mode commercial scanner (`snyk test` SCA + `snyk monitor` continuous tracking + companion `snyk code/container/iac` modes); `.snyk` policy file with mandatory `expires:` |
| Skill | [osv-scanner](skills/osv-scanner/SKILL.md) | Google's OSS scanner against OSV.dev; `osv-scanner scan -r ./` recursive; SBOM input; `osv-scanner.toml` config with `[[IgnoredVulns]] ignoreUntil` |
| Skill | [dependabot-config](skills/dependabot-config/SKILL.md) | GitHub-native `.github/dependabot.yml` reference: schedule, ignore, groups, allow, target-branch, auto-merge integration |
| Skill | [renovate-config](skills/renovate-config/SKILL.md) | Multi-platform `renovate.json` reference (GitHub/GitLab/Bitbucket/Azure DevOps/Gitea); presets, packageRules, vulnerabilityAlerts, automergeSchedule |
| Skill | [npm-pip-maven-audit](skills/npm-pip-maven-audit/SKILL.md) | Native package-manager audit commands: `npm audit`, `pip-audit`, `mvn dependency-check:check`, `cargo audit`, `bundle-audit` |
| Agent | [sca-prioritizer](agents/sca-prioritizer.md) | Adversarial prioritizer combining CVSS + EPSS + CISA KEV + reachability heuristic; refuses to waive CVEs in CISA KEV; refuses waivers without `expires:` + `approved_by:` + `reason:` |
| Skill | [cargo-audit-rust](skills/cargo-audit-rust/SKILL.md) | cargo-audit (RustSec advisory DB) for scanning Rust Cargo.lock dependencies. |
| Skill | [bundle-audit-ruby](skills/bundle-audit-ruby/SKILL.md) | bundler-audit (ruby-advisory-db) for scanning Ruby Gemfile.lock dependencies. |
| Skill | [reachability-analyzer](skills/reachability-analyzer/SKILL.md) | Dead-dependency / reachability analysis (depcheck, vulture, cargo-machete) to downrank unreachable vuln dependencies. |
| Skill | [cve-exploitability-triage](skills/cve-exploitability-triage/SKILL.md) | Ranks CVEs by exploitability rather than severity alone: EPSS probability, CISA KEV membership, OpenVEX status, reachability, then a four-bucket priority assignment; a KEV listing is never waivable. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sca@testland-qa
```
