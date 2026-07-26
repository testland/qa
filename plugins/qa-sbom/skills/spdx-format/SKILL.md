---
name: spdx-format
description: "Reference for the SPDX (Software Package Data Exchange) v2.3 + v3.0 SBOM specification - Linux Foundation-curated, license-focused format covering packages, files, snippets, relationships, license declarations, and (in 3.0) AI / dataset / build / security profiles; supports Tag-Value / JSON / YAML / RDF / Spreadsheet encodings; preferred by US Federal procurement (NIST guidance) and Linux distros. Use when the team's SBOM consumer requires SPDX format (federal procurement, Linux Foundation members, license-compliance focus)."
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
tooling landscape; doesn't run scans. Pair with `syft-generation`
to generate SPDX-format SBOMs.

## When to use

- US Federal procurement context (NIST SP 800-218 + EO 14028
  guidance favor SPDX).
- Linux Foundation member organization workflow.
- License-compliance focused use case (SPDX has the richest
  license-expression vocabulary).
- A consumer (regulator, customer) requires SPDX format
  specifically.

For security-focused use cases, `cyclonedx-format`
has richer first-class vuln support.

## How to use

1. Confirm the consumer requires SPDX (federal procurement, Linux
   Foundation, or license-compliance focus) - see When to use.
2. Generate SPDX 2.3 with `syft` or `anchore/sbom-action`
   (`format: spdx-json`) - Step 7 / references tooling.
3. Confirm the required fields (`spdxVersion`, `dataLicense`,
   `documentNamespace`, `creationInfo`, `packages[]`, at least one
   DESCRIBES relationship) - Step 2.
4. Express licenses with SPDX IDs; use `LicenseRef-` for custom
   licenses - Step 3.
5. Encode dependency edges in `relationships[]` (DESCRIBES +
   DEPENDS_ON) - Step 4.
6. Validate:
   `pyspdxtools --infile sbom.spdx.json --version SPDX-2.3` - Step 6.
7. Upload the validated SBOM as a CI artifact - Step 7.

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
| `DESCRIBES` / `DESCRIBED_BY` | Document to top-level package |
| `DEPENDS_ON` / `DEPENDENCY_OF` | Compile-time / runtime dep |
| `BUILD_DEPENDENCY_OF` | Build-only dep |
| `DEV_DEPENDENCY_OF` | Test/dev-only dep |
| `RUNTIME_DEPENDENCY_OF` | Runtime-only dep |
| `OPTIONAL_DEPENDENCY_OF` | Optional dep |
| `CONTAINS` / `CONTAINED_BY` | Container to contained file/package |
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

SPDX 3.0 profiles and the SPDX tooling landscape are cataloged in
[references/spdx3-profiles-and-tooling.md](references/spdx3-profiles-and-tooling.md);
for most teams, stay on SPDX 2.3 unless 3.0 features are required.

## Step 6 - Validation

```bash
# Python spdx-tools
pip install spdx-tools
pyspdxtools --infile sbom.spdx.json --version SPDX-2.3
# Validates structural conformance + license-expression syntax

# Validation via spdx online tool
# Upload to https://tools.spdx.org/app/
```

## Step 7 - CI integration

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

## Worked example

A team must deliver an SPDX 2.3 SBOM to a US Federal procurement
consumer for an app that bundles one proprietary component:

1. Generates via Syft in CI: `anchore/sbom-action` with
   `format: spdx-json`, producing `sbom.spdx.json` with
   `spdxVersion: "SPDX-2.3"`, `dataLicense: "CC0-1.0"`, and a unique
   `documentNamespace`.
2. The app package uses a non-standard license, so the team declares
   it via `hasExtractedLicensingInfos` and sets
   `licenseConcluded: "LicenseRef-AcmeProprietary"` (Step 3); every
   third-party package keeps its standard SPDX ID (`MIT`, etc.).
3. Adds `relationships[]`: `SPDXRef-DOCUMENT DESCRIBES` the app
   package, and the app `DEPENDS_ON` each dependency (Step 4).
4. Validates:
   `pyspdxtools --infile sbom.spdx.json --version SPDX-2.3` -
   structural + license-expression checks pass.

Result: a validated SPDX 2.3 JSON SBOM whose custom license resolves
cleanly and whose relationship graph satisfies the federal consumer's
format requirement.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `documentNamespace` | Can't deduplicate across BOM revisions | Generate unique URI per BOM |
| Use SPDX 3.0 with consumer expecting 2.3 | Tooling incompat | Stick to SPDX 2.3 unless 3.0 required (see references) |
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
- [references/spdx3-profiles-and-tooling.md](references/spdx3-profiles-and-tooling.md) - SPDX 3.0 profiles + tooling landscape
- spdx.dev - landing
- spdx.org/licenses - license ID list
- iso.org/standard/81870.html - ISO/IEC 5962:2021 (SPDX 2.2.1
  ISO publication)
- tools.spdx.org - online validator
- github.com/spdx/tools-python - Python reference impl
- `syft-generation`,
  `grype-scanning`,
  `cyclonedx-format`,
  `trivy-image` - sister tools
