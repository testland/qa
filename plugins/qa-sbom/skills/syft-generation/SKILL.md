---
name: syft-generation
description: "Generates Software Bill of Materials (SBOMs) using Anchore Syft — supports container images / directories / archives across OCI / Docker / Singularity formats; output formats CycloneDX-JSON / SPDX-JSON / Syft-JSON / table / GitHub-JSON; pairs with `grype-scanning` for SBOM-driven vuln scanning. Use when the team needs SBOM artifacts for compliance (US EO 14028, EU CRA, FDA medical-device guidance) or as input to vuln scanners."
rating: 23
d6: 4
archetype: S1
---

# syft-generation

## Overview

Per [github.com/anchore/syft][sf-gh]:

[sf-gh]: https://github.com/anchore/syft

Syft generates SBOMs from "container images, filesystems, archives"
with multi-container-standard support (OCI, Docker, Singularity).
The generated SBOM is the input artifact for vuln scanning
([`grype-scanning`](../grype-scanning/SKILL.md)) and compliance
delivery (SPDX or CycloneDX format per consumer requirement).

**Why generate SBOMs:**

- US Executive Order 14028 (May 2021) requires SBOMs for software
  sold to US federal agencies
- EU Cyber Resilience Act (in effect 2024+) requires SBOMs for
  products with digital elements
- FDA medical-device cybersecurity guidance requires SBOMs
- Internal supply-chain audits need a manifest of every dependency
  shipped

## When to use

- The team ships software to customers requiring an SBOM (federal,
  EU regulated, medical device, etc.).
- Internal compliance program requires SBOM as evidence artifact.
- The vuln-scanning workflow needs an SBOM input (Grype, OSV-Scanner
  with `--sbom`).
- Container-image build pipelines need accompanying SBOM for
  delivery alongside the image.

## Step 1 — Install

Per [sf-gh][sf-gh]:

```bash
# curl install
curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin

# Homebrew
brew install syft

# Docker
docker run --rm -v "$PWD:/scan" anchore/syft scan dir:/scan -o cyclonedx-json
```

Other paths (consult [sf-gh][sf-gh]): Scoop, Chocolatey, Nix.

## Step 2 — Basic SBOM generation

Per [sf-gh][sf-gh]:

```bash
# Container image
syft alpine:latest

# Local directory
syft ./my-project

# Specific output format to stdout
syft <image> -o cyclonedx-json

# Multiple formats to files in one pass
syft <image> -o spdx-json=./spdx.json -o cyclonedx-json=./cdx.json
```

The default output is the table format (human-readable); use
explicit `-o` for machine-readable formats in CI.

## Step 3 — Output format catalog

Per [sf-gh][sf-gh] format support:

| Format | Use |
|---|---|
| `cyclonedx-json` | CycloneDX 1.5+ JSON; broad ecosystem support |
| `cyclonedx-xml` | CycloneDX XML (older toolchains) |
| `spdx-json` | SPDX 2.3 JSON; preferred by US Federal procurement |
| `spdx-tag-value` | SPDX tag-value format (legacy) |
| `syft-json` | Syft-native JSON; richest metadata |
| `table` | Human-readable terminal table (default) |
| `github-json` | GitHub dependency-graph submission format |

For [`grype-scanning`](../grype-scanning/SKILL.md) input, use
`syft-json` (richest metadata) or `cyclonedx-json` (broader compat).

For compliance delivery, the consumer's requirement dictates —
SPDX-JSON for US federal, CycloneDX-JSON for most EU contexts.

## Step 4 — Source types

Per [sf-gh][sf-gh] supported sources:

| Source | Syntax |
|---|---|
| Local Docker daemon | `syft alpine:latest` |
| OCI / remote registry | `syft registry:docker.io/alpine:latest` |
| OCI archive (tar) | `syft oci-archive:./image.tar` |
| Docker archive (tar) | `syft docker-archive:./image.tar` |
| Local directory | `syft dir:./my-project` (or `syft ./my-project`) |
| File | `syft file:./pom.xml` |
| Singularity image | `syft singularity:./image.sif` |

## Step 5 — Attestation pattern (cosign)

For supply-chain integrity, attach the SBOM to the container image
via Sigstore cosign:

```bash
# Generate SBOM
syft my-image:1.0 -o cyclonedx-json=sbom.json

# Sign + attach to image (Sigstore)
cosign attest --predicate sbom.json --type cyclonedx my-image:1.0

# Verify
cosign verify-attestation --type cyclonedx my-image:1.0
```

The attestation lives alongside the image in the registry; downstream
consumers can verify provenance + retrieve the SBOM.

## Step 6 — False-positive triage analogue

Syft generates inventories, not findings — there's no FP triage
per se. The analogue here is **inventory accuracy**: ensuring
Syft correctly identifies all components.

| Mechanism | Use |
|---|---|
| `--exclude=PATH_PATTERN` | Skip directories from scan (vendor / generated) |
| `--catalogers=CATALOGER` | Restrict to specific catalogers (e.g., `npm`, `python`) |
| `--source-name=NAME` / `--source-version=VERSION` | Override SBOM-level metadata |
| `--platform=linux/amd64` | Target specific platform for multi-arch images |

**Inventory accuracy validation:**

```bash
# Compare two SBOMs (e.g., before vs after a build change)
syft image:1.0 -o syft-json=v1-sbom.json
syft image:1.1 -o syft-json=v1.1-sbom.json
diff <(jq -S . v1-sbom.json) <(jq -S . v1.1-sbom.json)
```

If Syft misses a component (false negative on inventory), the
downstream vuln scan misses any CVEs against that component.
Periodic accuracy validation against known dependencies catches
this.

## Step 7 — CI integration

```yaml
jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: anchore/sbom-action@v0
        with:
          path: ./
          format: cyclonedx-json
          output-file: sbom.cyclonedx.json
      - uses: anchore/sbom-action@v0
        with:
          path: ./
          format: spdx-json
          output-file: sbom.spdx.json
      - uses: actions/upload-artifact@v4
        with:
          name: sboms
          path: sbom.*.json
```

The `anchore/sbom-action` GHA wraps Syft + handles GitHub
dependency-graph submission automatically when `format: github-json`.

## Step 8 — Composition with sister tools

| Sister tool | Use |
|---|---|
| [`grype-scanning`](../grype-scanning/SKILL.md) | SBOM-driven vuln scanning (`grype sbom:./sbom.json`) |
| [`cyclonedx-format`](../cyclonedx-format/SKILL.md) | Reference for CycloneDX schema + spec compliance |
| [`spdx-format`](../spdx-format/SKILL.md) | Reference for SPDX schema + spec compliance |
| [`trivy-image`](../trivy-image/SKILL.md) | Alternative scanner (built-in SBOM gen + scan in one pass) |
| [`osv-scanner`](../../qa-sca/skills/osv-scanner/SKILL.md) | Cross-plugin: also accepts SBOM input |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generate SBOM only at release time | Misses build-time inventory differences | Generate per CI build + attest |
| Use single format only | Different consumers need different formats | Generate both CycloneDX + SPDX (Step 2) |
| Skip platform targeting on multi-arch images | Misses platform-specific deps | `--platform=linux/amd64` (Step 6) |
| Generate SBOM but don't attest / sign | Provenance unverifiable downstream | Cosign attest pattern (Step 5) |
| Trust Syft inventory without validation | Misses components → misses CVEs | Periodic accuracy check (Step 6) |

## Limitations

- Syft can't scan what it can't see — encrypted archives, custom
  package formats may produce incomplete SBOMs.
- Some language-specific catalogers have edge cases (e.g., npm
  workspaces, Python wheel quirks); validate against known deps.
- SBOM generation alone doesn't prove the deps are vulnerability-free
  — pair with [`grype-scanning`](../grype-scanning/SKILL.md).
- Multi-arch container scanning is per-platform; combine SBOMs
  manually or via tooling for unified view.

## References

- [sf-gh][sf-gh] — repository, install, scan commands, formats
- anchore.com/syft — landing
- ntia.gov/SBOM — NTIA SBOM minimum elements
- whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/
  — US EO 14028
- [`grype-scanning`](../grype-scanning/SKILL.md),
  [`cyclonedx-format`](../cyclonedx-format/SKILL.md),
  [`spdx-format`](../spdx-format/SKILL.md),
  [`trivy-image`](../trivy-image/SKILL.md) — sister tools
- [`vuln-prioritizer`](../../agents/vuln-prioritizer.md) — unifier agent
