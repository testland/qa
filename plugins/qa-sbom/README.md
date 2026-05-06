# qa-sbom

SBOM (Software Bill of Materials) generation + container image
vulnerability scanning + multi-tool prioritization. Three scanner
skills (Syft for SBOM gen, Grype for SBOM-aware scan, Trivy for
all-in-one container scan) plus two reference skills (CycloneDX +
SPDX format specs) plus an adversarial prioritizer agent that
combines CVSS + EPSS + CISA KEV + VEX assertions.

**Fifth Phase 5 plugin per the v2 master plan.** Required for US
EO 14028 (Federal procurement), EU CRA, FDA medical-device guidance,
and most enterprise supply-chain audits.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [syft-generation](skills/syft-generation/SKILL.md) | S1 | Anchore Syft SBOM generation; OCI/Docker/Singularity images, dirs, archives; CycloneDX/SPDX/Syft/GitHub-JSON output; cosign attestation |
| Skill | [grype-scanning](skills/grype-scanning/SKILL.md) | S1 | Anchore Grype vuln scanner; SBOM-aware (`grype sbom:./sbom.json`); EPSS/KEV/risk-score prioritization built-in; OpenVEX support |
| Skill | [cyclonedx-format](skills/cyclonedx-format/SKILL.md) | S2 | CycloneDX v1.6 spec reference: components, dependencies, services, vulnerabilities (VEX-equivalent), formulation, ML BOMs, per-language tooling |
| Skill | [spdx-format](skills/spdx-format/SKILL.md) | S2 | SPDX 2.3 + 3.0 spec reference: packages, files, relationships, licenses (canonical license-ID source); preferred by US Federal procurement |
| Skill | [trivy-image](skills/trivy-image/SKILL.md) | S1 | Aqua Trivy all-in-one container scanner: vuln + secret + misconfig + license in one pass; `--ignore-unfixed` actionable filter; `.trivyignore` + VEX |
| Agent | [vuln-prioritizer](agents/vuln-prioritizer.md) | A3 | Adversarial multi-scanner prioritizer (Grype + Trivy + Snyk + OSV-SBOM); CVSS + EPSS + KEV + VEX-status into Fix-Now/This-Sprint/Backlog/Accept-Risk; refuses to waive CISA KEV CVEs |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sbom@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** + the **Phase 5
amendment requiring False-positive triage in every scanner skill**.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md)
at the repository root for the rubric.
