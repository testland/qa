---
name: syft-generation
description: "Generates, scans, and diffs Software Bills of Materials (SBOMs) with the Anchore stack - Syft generation from container images / directories / archives across OCI / Docker / Singularity formats (output CycloneDX-JSON / SPDX-JSON / Syft-JSON / table / GitHub-JSON, cosign attestation); the paired generate + scan workflow with Grype (`grype sbom:./sbom.json`, `--fail-on high`, `--only-fixed`, `.grype.yaml` ignore rules with mandatory `expires:`, EPSS/KEV prioritization); and SBOM-to-SBOM diffing via `cyclonedx diff --component-versions` to gate CI on net-new components and detect supply-chain drift between builds. Use when the team needs SBOM artifacts for compliance (US EO 14028, EU CRA, FDA medical-device guidance), SBOM-driven vulnerability scanning, or dependency-drift detection between releases."
---

# syft-generation

## Overview

Per [github.com/anchore/syft][sf-gh], Syft generates SBOMs from "container
images, filesystems, archives" (OCI, Docker, Singularity). The SBOM is the
input artifact for vuln scanning with Grype (Step 7), for SBOM-to-SBOM
drift diffing (Step 8), and for compliance delivery in SPDX or CycloneDX
format.

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
- A rebuilt image needs a dependency-drift check ("what changed in the
  inventory?") or a "no unexpected new transitive deps" release gate
  (Step 8).

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
and `syft-json` (richest metadata). For Grype scan input (Step 7) use
`syft-json` or `cyclonedx-json`; for compliance delivery the consumer
dictates (SPDX-JSON US federal, CycloneDX-JSON most EU) - see `sbom-formats`
for the format-choice guidance. The full format catalog is in
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

## Step 7 - Generate + scan workflow (Grype)

Grype is the Anchore vuln scanner that pairs with Syft. Per
[github.com/anchore/grype][gr-gh], three input modes:

[gr-gh]: https://github.com/anchore/grype

| Input mode | Use |
|---|---|
| Container image | `grype alpine:latest` (Grype generates SBOM internally) |
| Directory | `grype ./my-project` (filesystem scan) |
| SBOM input | `grype sbom:./sbom.json` (no re-generation; faster + auditable) |

The SBOM-input mode is the recommended production pattern: generate the
SBOM once via Syft (Step 2), attest via cosign (Step 5), then scan the
SBOM. Decoupling gives an audit trail and allows re-scanning with a
refreshed vuln DB without re-building. Per [gr-gh][gr-gh], coverage spans
major OS package ecosystems (Alpine, Debian, Ubuntu, RHEL, Amazon Linux)
and language packages (Ruby, Java, JavaScript, Python, .NET, Go, PHP,
Rust).

```bash
# Install
curl -sSfL https://get.anchore.io/grype | sudo sh -s -- -b /usr/local/bin

# Scan the Syft-generated SBOM (recommended)
grype sbom:./sbom.json

# Output formats: table (default) / json / sarif / cyclonedx-json / template
grype sbom:./sbom.json -o sarif       # GitHub Code Scanning
grype sbom:./sbom.json -o json        # EPSS + KEV + risk-score annotations

# CI gate: exit 1 at/above severity; focus on upgradable findings
grype sbom:./sbom.json --fail-on high --only-fixed
```

Severity levels per [gr-gh][gr-gh]: `critical`, `high`, `medium`, `low`,
`negligible`, `unknown`. The JSON output annotates findings with EPSS, KEV,
and risk scoring for downstream prioritization.

**Suppression (MANDATORY triage):** Grype's native path is `.grype.yaml`
ignore rules - per-CVE, per-package+version, or pattern-based
(`fix-state`), each with a mandatory `expires:` date and a reachability
`reason:`. Full config + justification template:
[references/grype-ignore-rules.md](references/grype-ignore-rules.md).
OpenVEX status assertions (`not_affected` / `fixed` / etc., see
`vex-author`) filter findings in a signed, machine-readable way. Audit
ignore entries quarterly; expired entries are removed.

**DB management for CI determinism** - Grype's DB updates multiple times
per day; pin per scan or results vary run to run:

```bash
grype db update                                # manual refresh
grype db status
grype db import grype-db-v6-2026-05-06.tar.gz  # pinned version for CI
```

**CI wiring** - `anchore/scan-action` wraps Grype + SARIF upload:

```yaml
      - uses: anchore/scan-action@v5
        with:
          sbom: sbom.cyclonedx.json
          fail-build: true
          severity-cutoff: high
          output-format: sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: results.sarif }
```

Grype's DB is Anchore-curated; coverage differs from OSV.dev / Snyk / NVD -
pair with `osv-scanner` or `snyk-test` (qa-sca plugin) for consensus. No
reachability analysis: every CVE on a declared component counts.

## Step 8 - Diffing SBOMs across versions

An SBOM diff turns two point-in-time inventories into a change signal:
which components are net-new, removed, or version-changed between image or
build versions. Per [github.com/CycloneDX/cyclonedx-cli][cdx-cli-gh], the
CycloneDX CLI provides a first-class `diff` subcommand accepting any two
CycloneDX BOMs (XML, JSON, or Protobuf):

[cdx-cli-gh]: https://github.com/CycloneDX/cyclonedx-cli

```bash
# Install: brew install cyclonedx/cyclonedx/cyclonedx-cli
#   or:    docker run cyclonedx/cyclonedx-cli ...

# Generate both inventories with the SAME source type + format
syft myapp:1.0 -o cyclonedx-json=sbom-v1.0.json
syft myapp:1.1 -o cyclonedx-json=sbom-v1.1.json

# Human-readable diff
cyclonedx diff sbom-v1.0.json sbom-v1.1.json --component-versions

# Machine-readable diff for CI gate logic
cyclonedx diff sbom-v1.0.json sbom-v1.1.json \
  --component-versions --output-format json > diff-result.json
```

Key flags per [cdx-cli-gh][cdx-cli-gh]: `--component-versions` (the signal
flag - reports added / removed / version-changed components; without it
only structural BOM changes are reported), `--from-format` / `--to-format`
(`autodetect` / `json` / `xml` / `protobuf`), `--output-format`
(`text` / `json`).

The JSON output carries three lists: **added** (net-new deps - review
every entry: expected transitive dep, base-image update, or supply-chain
risk), **removed** (may hide a dep renamed by a packaging change), and
**modified** (version changes with old + new values). Minimal CI gate:

```bash
ADDED=$(jq '.added | length' diff-result.json)
if [ "$ADDED" -gt "0" ]; then
  echo "::error::Net-new components detected. Review diff-result.json."
  jq '.added' diff-result.json
  exit 1
fi
```

The full GitHub Actions gate with allowlist-subtraction, plus the
nightly-drift workflow (diff production tag vs last known-good SBOM,
rotate the baseline only on a clean diff), are in
[references/diff-ci-workflows.md](references/diff-ci-workflows.md).

Diff rules of thumb: always pass `--component-versions`; generate both
SBOMs with the same tool, format, and source type (`dir:` vs image scope
mismatch produces noisy diffs); diff multi-arch images per-platform
(`--platform=linux/amd64` on both runs); SPDX SBOMs need
`cyclonedx convert` first. The diff shows inventory change, not
vulnerability change - scan net-new components with Grype (Step 7).

## Step 9 - CI integration

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

## Step 10 - Composition with sister tools

| Sister tool | Use |
|---|---|
| `sbom-formats` | Reference for CycloneDX + SPDX schemas and format choice |
| `trivy-image` | Alternative scanner (built-in SBOM gen + scan in one pass) |
| `vex-author` | OpenVEX documents that filter Grype findings (Step 7) |
| `osv-scanner` | Cross-plugin: also accepts SBOM input |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Generate SBOM only at release time | Misses build-time inventory differences | Generate per CI build + attest |
| Use single format only | Different consumers need different formats | Generate both CycloneDX + SPDX (Step 2) |
| Skip platform targeting on multi-arch images | Misses platform-specific deps | `--platform=linux/amd64` (Step 6) |
| Generate SBOM but don't attest / sign | Provenance unverifiable downstream | Cosign attest pattern (Step 5) |
| Trust Syft inventory without validation | Misses components → misses CVEs | Periodic accuracy check (Step 6) |
| Re-generate SBOM via Grype on every scan | Slow + non-deterministic; SBOM lives outside scan | Use `sbom:` input mode (Step 7) |
| `.grype.yaml` ignore without `expires:` | Permanent debt | Mandatory `expires:` (Step 7) |
| Skip Grype DB pin in CI | Different DB version per run; non-deterministic | Pin DB version (Step 7) |
| Diff without `--component-versions` | Reports only structural BOM changes, not inventory delta | Always pass the flag (Step 8) |
| Diff SBOMs from different tools / scan depths | Format + scope mismatches appear as false diffs | Same generator, format, source type (Step 8) |

## Limitations

- Syft can't scan what it can't see - encrypted archives, custom
  package formats may produce incomplete SBOMs.
- Some language-specific catalogers have edge cases (e.g., npm
  workspaces, Python wheel quirks); validate against known deps.
- SBOM generation alone doesn't prove the deps are vulnerability-free -
  run the Grype scan step (Step 7).
- Multi-arch container scanning is per-platform; combine SBOMs
  manually or via tooling for unified view.
- Grype includes no reachability analysis, and its DB coverage differs
  from OSV.dev / Snyk / NVD (Step 7).
- `cyclonedx diff` operates on CycloneDX only; SPDX SBOMs require
  `cyclonedx convert` first (Step 8).

## References

- [sf-gh][sf-gh] - Syft repository: install, scan commands, formats
- [gr-gh][gr-gh] - Grype repository: install, input modes, `--fail-on`
- [cdx-cli-gh][cdx-cli-gh] - cyclonedx-cli repository: diff flags + output
- [references/formats.md](references/formats.md) - full output format catalog + source-type syntax
- [references/grype-ignore-rules.md](references/grype-ignore-rules.md) - `.grype.yaml` config + justification template
- [references/diff-ci-workflows.md](references/diff-ci-workflows.md) - diff CI gate + nightly drift workflows
- anchore.com/syft - landing
- oss.anchore.com/docs/reference/grype/cli/ - full Grype CLI reference
- openvex.dev - OpenVEX specification; first.org/epss - EPSS data source
- ntia.gov/SBOM - NTIA SBOM minimum elements
- whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/ - US EO 14028
- `sbom-formats`,
  `trivy-image`,
  `vex-author` - sister tools
