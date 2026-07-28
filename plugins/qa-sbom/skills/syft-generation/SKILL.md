---
name: syft-generation
description: "Generates Software Bill of Materials (SBOMs) using Anchore Syft - supports container images / directories / archives across OCI / Docker / Singularity formats; output formats CycloneDX-JSON / SPDX-JSON / Syft-JSON / table / GitHub-JSON; pairs with `grype-scanning` for SBOM-driven vuln scanning. Use when the team needs SBOM artifacts for compliance (US EO 14028, EU CRA, FDA medical-device guidance) or as input to vuln scanners."
---

# syft-generation

## Overview

Per [github.com/anchore/syft][sf-gh], Syft generates SBOMs from "container
images, filesystems, archives" (OCI, Docker, Singularity). The SBOM is the
input artifact for vuln scanning (`grype-scanning`) and for compliance
delivery in SPDX or CycloneDX format.

[sf-gh]: https://github.com/anchore/syft

SBOMs are mandated by US EO 14028 (software sold to federal agencies), the EU
Cyber Resilience Act (products with digital elements, in effect 2024+), and
FDA medical-device guidance; internal supply-chain audits also need a full
dependency manifest.

## When to use

- The team ships software to customers requiring an SBOM (federal,
  EU regulated, medical device, etc.).
- Internal compliance program requires SBOM as evidence artifact.
- The vuln-scanning workflow needs an SBOM input (Grype, OSV-Scanner
  with `--sbom`).
- Container-image build pipelines need accompanying SBOM for
  delivery alongside the image.

## Step 1 - Install

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

## Step 2 - Basic SBOM generation

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

## Step 3 - Output format catalog

Per [sf-gh][sf-gh], the common formats are `cyclonedx-json` (CycloneDX 1.5+,
broad support), `spdx-json` (SPDX 2.3, preferred by US federal procurement),
and `syft-json` (richest metadata). For `grype-scanning` input use `syft-json`
or `cyclonedx-json`; for compliance delivery the consumer dictates (SPDX-JSON
US federal, CycloneDX-JSON most EU). The full format catalog is in
[references/formats.md](references/formats.md).

## Step 4 - Source types

Per [sf-gh][sf-gh], the common sources are a local Docker image
(`syft alpine:latest`), a remote registry
(`syft registry:docker.io/alpine:latest`), an archive
(`syft oci-archive:./image.tar`), and a directory (`syft dir:./my-project`).
The full source-type syntax table is in
[references/formats.md](references/formats.md).

## Step 5 - Attestation pattern (cosign)

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

## Step 6 - False-positive triage analogue

Syft generates inventories, not findings - there's no FP triage
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

## Step 7 - CI integration

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

## Step 8 - Composition with sister tools

| Sister tool | Use |
|---|---|
| `grype-scanning` | SBOM-driven vuln scanning (`grype sbom:./sbom.json`) |
| `cyclonedx-format` | Reference for CycloneDX schema + spec compliance |
| `spdx-format` | Reference for SPDX schema + spec compliance |
| `trivy-image` | Alternative scanner (built-in SBOM gen + scan in one pass) |
| `osv-scanner` | Cross-plugin: also accepts SBOM input |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generate SBOM only at release time | Misses build-time inventory differences | Generate per CI build + attest |
| Use single format only | Different consumers need different formats | Generate both CycloneDX + SPDX (Step 2) |
| Skip platform targeting on multi-arch images | Misses platform-specific deps | `--platform=linux/amd64` (Step 6) |
| Generate SBOM but don't attest / sign | Provenance unverifiable downstream | Cosign attest pattern (Step 5) |
| Trust Syft inventory without validation | Misses components → misses CVEs | Periodic accuracy check (Step 6) |

## Limitations

- Syft can't scan what it can't see - encrypted archives, custom
  package formats may produce incomplete SBOMs.
- Some language-specific catalogers have edge cases (e.g., npm
  workspaces, Python wheel quirks); validate against known deps.
- SBOM generation alone doesn't prove the deps are vulnerability-free - pair with `grype-scanning`.
- Multi-arch container scanning is per-platform; combine SBOMs
  manually or via tooling for unified view.

## References

- [sf-gh][sf-gh] - repository, install, scan commands, formats
- [references/formats.md](references/formats.md) - full output format catalog + source-type syntax
- anchore.com/syft - landing
- ntia.gov/SBOM - NTIA SBOM minimum elements
- whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/ - US EO 14028
- `grype-scanning`,
  `cyclonedx-format`,
  `spdx-format`,
  `trivy-image` - sister tools
