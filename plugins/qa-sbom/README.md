# qa-sbom

SBOM (Software Bill of Materials) generation + container image
vulnerability scanning + multi-tool prioritization. Two scanner
skills (Syft for SBOM generation with the paired Grype scan and
SBOM-diff workflows, Trivy for all-in-one container scan), a
formats reference skill (CycloneDX primary + SPDX as a reference),
a VEX authoring skill, and an adversarial prioritizer agent that
combines CVSS + EPSS + CISA KEV + VEX assertions.

Required for US EO 14028 (Federal procurement), EU CRA, FDA
medical-device guidance, and most enterprise supply-chain audits.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [syft-generation](skills/syft-generation/SKILL.md) | Anchore Syft SBOM generation (OCI/Docker/Singularity images, dirs, archives; CycloneDX/SPDX/Syft/GitHub-JSON output; cosign attestation) plus the paired Grype scan workflow (`grype sbom:./sbom.json`, EPSS/KEV prioritization, `.grype.yaml` ignores) and SBOM diffing (`cyclonedx diff` net-new/removed/version-changed gate) |
| Skill | [sbom-formats](skills/sbom-formats/SKILL.md) | SBOM format reference + format choice: CycloneDX v1.6 primary (components, dependencies, services, embedded VEX, formulation, ML BOMs, per-language tooling) with SPDX 2.3 + 3.0 as a reference (packages, relationships, licenses; US Federal procurement) |
| Skill | [trivy-image](skills/trivy-image/SKILL.md) | Aqua Trivy all-in-one container scanner: vuln + secret + misconfig + license in one pass; `--ignore-unfixed` actionable filter; `.trivyignore` + VEX |
| Agent | [vuln-prioritizer](agents/vuln-prioritizer.md) | Adversarial multi-scanner prioritizer (Grype + Trivy + Snyk + OSV-SBOM); CVSS + EPSS + KEV + VEX-status into Fix-Now/This-Sprint/Backlog/Accept-Risk; refuses to waive CISA KEV CVEs |
| Skill | [vex-author](skills/vex-author/SKILL.md) | Author and validate OpenVEX documents (not_affected justifications) that vuln-prioritizer consumes. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sbom@testland-qa
```
