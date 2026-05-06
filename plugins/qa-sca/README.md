# qa-sca

SCA (Software Composition Analysis) — dependency scanning + update
orchestration. Three per-tool scanner skills (Snyk, OSV-Scanner,
native package-manager audit) plus two reference skills for the
update-orchestration tools (Dependabot, Renovate) plus an
adversarial prioritizer agent that combines CVSS + EPSS + CISA KEV
+ reachability heuristic into a Fix-Now / Fix-This-Sprint /
Fix-Backlog / Accept-Risk bucket.

**Third Phase 5 plugin per the v2 master plan.** Sister to
[`qa-sast`](../qa-sast/) (code security) and [`qa-dast`](../qa-dast/)
(runtime security) — qa-sca covers third-party dependency security.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [snyk-test](skills/snyk-test/SKILL.md) | S1 | Multi-mode commercial scanner (`snyk test` SCA + `snyk monitor` continuous tracking + companion `snyk code/container/iac` modes); `.snyk` policy file with mandatory `expires:` |
| Skill | [osv-scanner](skills/osv-scanner/SKILL.md) | S1 | Google's OSS scanner against OSV.dev; `osv-scanner scan -r ./` recursive; SBOM input; `osv-scanner.toml` config with `[[IgnoredVulns]] ignoreUntil` |
| Skill | [dependabot-config](skills/dependabot-config/SKILL.md) | S2 | GitHub-native `.github/dependabot.yml` reference: schedule, ignore, groups, allow, target-branch, auto-merge integration |
| Skill | [renovate-config](skills/renovate-config/SKILL.md) | S2 | Multi-platform `renovate.json` reference (GitHub/GitLab/Bitbucket/Azure DevOps/Gitea); presets, packageRules, vulnerabilityAlerts, automergeSchedule |
| Skill | [npm-pip-maven-audit](skills/npm-pip-maven-audit/SKILL.md) | S1 | Native package-manager audit commands: `npm audit`, `pip-audit`, `mvn dependency-check:check`, `cargo audit`, `bundle-audit` |
| Agent | [sca-prioritizer](agents/sca-prioritizer.md) | A3 | Adversarial prioritizer combining CVSS + EPSS + CISA KEV + reachability heuristic; refuses to waive CVEs in CISA KEV; refuses waivers without `expires:` + `approved_by:` + `reason:` |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sca@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** + the **Phase 5
amendment requiring the False-positive triage section in every
scanner skill** (or its config-side analogue for the orchestration-tool
reference skills). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
