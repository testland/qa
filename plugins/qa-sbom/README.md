# qa-sbom

SBOM (Software Bill of Materials) generation + container image
vulnerability scanning + multi-tool prioritization. Three scanner
skills (Syft for SBOM gen, Grype for SBOM-aware scan, Trivy for
all-in-one container scan) plus two reference skills (CycloneDX +
SPDX format specs) plus an adversarial prioritizer agent that
combines CVSS + EPSS + CISA KEV + VEX assertions.

Required for US EO 14028 (Federal procurement), EU CRA, FDA
medical-device guidance, and most enterprise supply-chain audits.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [syft-generation](skills/syft-generation/SKILL.md) | Anchore Syft SBOM generation; OCI/Docker/Singularity images, dirs, archives; CycloneDX/SPDX/Syft/GitHub-JSON output; cosign attestation |
| Skill | [grype-scanning](skills/grype-scanning/SKILL.md) | Anchore Grype vuln scanner; SBOM-aware (`grype sbom:./sbom.json`); EPSS/KEV/risk-score prioritization built-in; OpenVEX support |
| Skill | [cyclonedx-format](skills/cyclonedx-format/SKILL.md) | CycloneDX v1.6 spec reference: components, dependencies, services, vulnerabilities (VEX-equivalent), formulation, ML BOMs, per-language tooling |
| Skill | [spdx-format](skills/spdx-format/SKILL.md) | SPDX 2.3 + 3.0 spec reference: packages, files, relationships, licenses (canonical license-ID source); preferred by US Federal procurement |
| Skill | [trivy-image](skills/trivy-image/SKILL.md) | Aqua Trivy all-in-one container scanner: vuln + secret + misconfig + license in one pass; `--ignore-unfixed` actionable filter; `.trivyignore` + VEX |
| Agent | [vuln-prioritizer](agents/vuln-prioritizer.md) | Adversarial multi-scanner prioritizer (Grype + Trivy + Snyk + OSV-SBOM); CVSS + EPSS + KEV + VEX-status into Fix-Now/This-Sprint/Backlog/Accept-Risk; refuses to waive CISA KEV CVEs |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sbom@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
