---
name: spdx-format
description: "Reference for the SPDX (Software Package Data Exchange) v2.3 + v3.0 SBOM specification - Linux Foundation-curated, license-focused format covering packages, files, snippets, relationships, license declarations, and (in 3.0) AI / dataset / build / security profiles; supports Tag-Value / JSON / YAML / RDF / Spreadsheet encodings; preferred by US Federal procurement (NIST guidance) and Linux distros. Use when the team's SBOM consumer requires SPDX format (federal procurement, Linux Foundation members, license-compliance focus)."
rating: 22
d6: 4
---

# spdx-format

## Overview

SPDX is the Linux Foundation's SBOM standard, originally focused on
license compliance. Per [spdx.org/specifications][spdx-spec]:

[spdx-spec]: https://spdx.dev/specifications/

Two active major versions:

| Version | Status | Notable |
|---|---|---|
| SPDX 2.3 | Stable; broadly tooled | Tag-Value / JSON / YAML / RDF / Spreadsheet; ISO/IEC 5962:2021 |
| SPDX 3.0 | Recent (2024); growing tooling | Profile-based: core + software + AI + dataset + build + security; JSON-LD primary |

This is a **reference skill** - defines the schema +
tooling landscape; doesn't run scans. Pair with [`syft-generation`](../syft-generation/SKILL.md)
to generate SPDX-format SBOMs.

## When to use

- US Federal procurement context (NIST SP 800-218 + EO 14028
  guidance favor SPDX).
- Linux Foundation member organization workflow.
- License-compliance focused use case (SPDX has the richest
  license-expression vocabulary).
- A consumer (regulator, customer) requires SPDX format
  specifically.

For security-focused use cases, [`cyclonedx-format`](../cyclonedx-format/SKILL.md)
has richer first-class vuln support.

## Step 1 - SPDX 2.3 top-level structure (JSON)

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "my-app-1.0.0-sbom",
  "documentNamespace": "https://example.com/spdx/my-app/1.0.0",
  "creationInfo": {
    "created": "2026-05-06T12:00:00Z",
    "creators": ["Tool: syft-1.16.0", "Organization: Acme Corp"]
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-myapp",
      "name": "my-app",
      "versionInfo": "1.0.0",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "licenseConcluded": "Apache-2.0",
      "licenseDeclared": "Apache-2.0"
    },
    {
      "SPDXID": "SPDXRef-Package-lodash",
      "name": "lodash",
      "versionInfo": "4.17.20",
      "downloadLocation": "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz",
      "filesAnalyzed": false,
      "licenseConcluded": "MIT",
      "licenseDeclared": "MIT"
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relationshipType": "DESCRIBES",
      "relatedSpdxElement": "SPDXRef-Package-myapp"
    },
    {
      "spdxElementId": "SPDXRef-Package-myapp",
      "relationshipType": "DEPENDS_ON",
      "relatedSpdxElement": "SPDXRef-Package-lodash"
    }
  ]
}
```

## Step 2 - Required fields per SPDX 2.3

Per [spdx-spec][spdx-spec]:

| Field | Required? | Use |
|---|---|---|
| `spdxVersion` | yes | Must be `"SPDX-2.3"` |
| `dataLicense` | yes | `"CC0-1.0"` (CC0 - the SBOM data itself) |
| `SPDXID` | yes | `"SPDXRef-DOCUMENT"` |
| `name` | yes | Human-readable doc name |
| `documentNamespace` | yes | Unique URI per BOM revision |
| `creationInfo.created` | yes | ISO 8601 timestamp |
| `creationInfo.creators` | yes | Tool / org / person who created |
| `packages[]` | required for non-empty BOM | Inventory |
| `relationships[]` | required (at least DESCRIBES) | Dep graph |

## Step 3 - License expressions

SPDX is the canonical source for license identifiers (cross-format
standard - even CycloneDX uses SPDX license IDs).

```json
"licenseConcluded": "Apache-2.0",
"licenseConcluded": "MIT OR Apache-2.0",
"licenseConcluded": "(MIT AND BSD-3-Clause) OR GPL-2.0-only WITH Classpath-exception-2.0"
```

Full list: spdx.org/licenses (current count ~600+).

The `LicenseRef-` prefix declares custom licenses:

```json
"hasExtractedLicensingInfos": [{
  "licenseId": "LicenseRef-AcmeProprietary",
  "extractedText": "Acme Proprietary License Text..."
}],
"licenseConcluded": "LicenseRef-AcmeProprietary"
```

## Step 4 - Relationships

The `relationships[]` block is the dep-graph (SPDX equivalent of
CycloneDX's `dependencies[]`):

| RelationshipType | Use |
|---|---|
| `DESCRIBES` / `DESCRIBED_BY` | Document ↔ top-level package |
| `DEPENDS_ON` / `DEPENDENCY_OF` | Compile-time / runtime dep |
| `BUILD_DEPENDENCY_OF` | Build-only dep |
| `DEV_DEPENDENCY_OF` | Test/dev-only dep |
| `RUNTIME_DEPENDENCY_OF` | Runtime-only dep |
| `OPTIONAL_DEPENDENCY_OF` | Optional dep |
| `CONTAINS` / `CONTAINED_BY` | Container ↔ contained file/package |
| `GENERATED_FROM` | Source-of-build |
| `STATIC_LINK` / `DYNAMIC_LINK` | Linkage type |

## Step 5 - Tag-Value format (SPDX-native)

Some toolchains use the SPDX Tag-Value format (older but well-tooled):

```
SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: my-app-1.0.0-sbom
DocumentNamespace: https://example.com/spdx/my-app/1.0.0
Creator: Tool: syft-1.16.0
Creator: Organization: Acme Corp
Created: 2026-05-06T12:00:00Z

PackageName: my-app
SPDXID: SPDXRef-Package-myapp
PackageVersion: 1.0.0
PackageDownloadLocation: NOASSERTION
FilesAnalyzed: false
PackageLicenseConcluded: Apache-2.0
PackageLicenseDeclared: Apache-2.0

Relationship: SPDXRef-DOCUMENT DESCRIBES SPDXRef-Package-myapp
```

JSON is preferred for new toolchains; Tag-Value persists for legacy
integrations.

## Step 6 - SPDX 3.0 profiles

SPDX 3.0 (2024 release) restructures into composable profiles:

| Profile | Use |
|---|---|
| `core` | Minimum BOM model |
| `software` | Software-specific extensions (≈ SPDX 2.3 packages) |
| `licensing` | License identification + expressions |
| `security` | Vulnerability + VEX statements |
| `ai` | AI/ML models, datasets, hyperparameters |
| `dataset` | Dataset-specific metadata |
| `build` | Build provenance (similar to in-toto attestations) |

JSON-LD is the primary encoding; tooling support is growing but
less mature than 2.3 as of 2026.

For most teams, **stay on SPDX 2.3 unless 3.0 features are required** - 2.3 has broader tooling.

## Step 7 - Tooling

| Tool | Use |
|---|---|
| `syft` | Generates SPDX 2.3 (JSON / Tag-Value); cross-source |
| `spdx-tools` | Reference impl (Python); validation + conversion |
| `spdx-tools-java` | Java reference impl |
| `ORT` (OSS Review Toolkit) | License compliance scanning + SPDX reporting |
| `spdx-sbom-generator` | Per-language native generation |
| `tern` | Container image SPDX generation |
| `Trivy` | Cross-purpose scanner with SPDX output |

## Step 8 - Validation

```bash
# Python spdx-tools
pip install spdx-tools
pyspdxtools --infile sbom.spdx.json --version SPDX-2.3
# Validates structural conformance + license-expression syntax

# Validation via spdx online tool
# Upload to https://tools.spdx.org/app/
```

## Step 9 - CI integration

```yaml
jobs:
  spdx:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: anchore/sbom-action@v0
        with:
          format: spdx-json
          output-file: sbom.spdx.json
      - run: |
          pip install spdx-tools
          pyspdxtools --infile sbom.spdx.json --version SPDX-2.3
      - uses: actions/upload-artifact@v4
        with:
          name: spdx-sbom
          path: sbom.spdx.json
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `documentNamespace` | Can't deduplicate across BOM revisions | Generate unique URI per BOM |
| Use SPDX 3.0 with consumer expecting 2.3 | Tooling incompat | Stick to SPDX 2.3 unless 3.0 required (Step 6) |
| Manual license assignment without `LicenseRef-` for custom | License-expression validation fails | Use proper SPDX license ID or `LicenseRef-` (Step 3) |
| Skip `relationships[]` (just packages) | No dep-graph; downstream tools degrade | Always include DESCRIBES + DEPENDS_ON (Step 4) |
| Mix Tag-Value + JSON in same workflow | Toolchain confusion | Pick one format per workflow (Step 5) |

## Limitations

- SPDX 2.3 vuln support is weaker than CycloneDX 1.6 (no first-class
  vulnerabilities block - relies on companion VEX docs).
- License-expression validation is strict; non-standard licenses
  require `LicenseRef-` boilerplate.
- SPDX 3.0 tooling is still maturing; many tools still produce 2.3.
- Tag-Value parsing is whitespace-sensitive; subtle formatting
  bugs.

## References

- [spdx-spec][spdx-spec] - official specification
- spdx.dev - landing
- spdx.org/licenses - license ID list
- iso.org/standard/81870.html - ISO/IEC 5962:2021 (SPDX 2.2.1
  ISO publication)
- tools.spdx.org - online validator
- github.com/spdx/tools-python - Python reference impl
- [`syft-generation`](../syft-generation/SKILL.md),
  [`grype-scanning`](../grype-scanning/SKILL.md),
  [`cyclonedx-format`](../cyclonedx-format/SKILL.md),
  [`trivy-image`](../trivy-image/SKILL.md) - sister tools
- [`vuln-prioritizer`](../../agents/vuln-prioritizer.md) - unifier agent
