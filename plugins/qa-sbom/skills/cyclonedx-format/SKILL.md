---
name: cyclonedx-format
description: "Reference for the CycloneDX v1.6 SBOM specification - OWASP-curated, BOM-format-rich format covering software components, services, dependencies, vulnerabilities, formulation, machine learning models, and SaaS BOMs; supports XML / JSON / Protobuf encodings; per-language tooling (cyclonedx-bom-tool family) for npm, pip, Maven, Gradle, Go, etc.; integrates with CI via gen + sign + attest workflow. Use when the team adopts CycloneDX as primary SBOM format (preferred for security-focused use cases vs SPDX's licensing focus)."
---

# cyclonedx-format

## Overview

CycloneDX is one of two mainstream SBOM formats (SPDX is the
other). Per [cyclonedx.org/specification/overview][cdx-spec]:

[cdx-spec]: https://cyclonedx.org/specification/overview/

CycloneDX is OWASP-curated and security-focused. Distinguishing
features vs SPDX:

- **Vulnerability schema** - first-class `vulnerabilities[]` block
  with VEX-style status assertions
- **Services + dataflow** - `services[]` block describes service
  endpoints + data flows
- **Formulation** - describes how the software was built (build
  steps, tools, env)
- **ML BOMs (CycloneDX 1.5+)** - first-class ML model + dataset
  components
- **SaaS BOMs** - describes hosted services not just shipped
  artifacts

This is a **reference skill** - defines the schema +
tooling landscape; doesn't run scans. Pair with `syft-generation`
to generate CycloneDX-format SBOMs from real codebases.

## When to use

- The team adopts CycloneDX as the primary SBOM format.
- The use case is security-focused (vuln tracking, supply-chain
  attestation) over licensing-focused.
- A consumer (vendor, customer, regulator) requires CycloneDX
  format specifically.
- Per-language CycloneDX-native tooling is preferred over
  Syft+convert.

For licensing-focused / Linux Foundation contexts, `spdx-format`
is more idiomatic.

## How to use

1. Confirm CycloneDX is the format your consumer requires and that
   the use case is security-focused (see When to use).
2. Generate the BOM - run a per-language native tool
   ([references/component-types-and-tooling.md](references/component-types-and-tooling.md))
   or `anchore/sbom-action` with `format: cyclonedx-json`.
3. Confirm the required fields are present (`bomFormat`,
   `specVersion`, `components[]`, `dependencies[]`) - Step 2.
4. Add a `vulnerabilities[]` record with a VEX-style
   `analysis.state` for any finding you have triaged - Step 3 / Step 5.
5. Validate against the schema:
   `cyclonedx validate --input-file sbom.json --input-version v1_6` - Step 4.
6. Sign + attest the BOM in CI
   (`cosign attest --predicate ... --type cyclonedx`) - Step 6.
7. Pin the `specVersion` your consumer agreed to; re-issue with an
   incremented `version` on each change.

## Step 1 - Top-level structure

A minimal CycloneDX 1.6 BOM (JSON):

```json
{
  "$schema": "http://cyclonedx.org/schema/bom-1.6.schema.json",
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79",
  "version": 1,
  "metadata": {
    "timestamp": "2026-05-06T12:00:00Z",
    "tools": [{"vendor": "anchore", "name": "syft", "version": "1.16.0"}],
    "component": {
      "type": "application",
      "name": "my-app",
      "version": "1.0.0",
      "purl": "pkg:generic/my-app@1.0.0"
    }
  },
  "components": [
    {
      "type": "library",
      "bom-ref": "pkg:npm/lodash@4.17.20",
      "name": "lodash",
      "version": "4.17.20",
      "purl": "pkg:npm/lodash@4.17.20",
      "licenses": [{"license": {"id": "MIT"}}]
    }
  ],
  "dependencies": [
    {
      "ref": "pkg:generic/my-app@1.0.0",
      "dependsOn": ["pkg:npm/lodash@4.17.20"]
    }
  ]
}
```

## Step 2 - Required fields per spec

Per [cdx-spec][cdx-spec]:

| Field | Required? | Use |
|---|---|---|
| `bomFormat` | yes | Must be `"CycloneDX"` |
| `specVersion` | yes | `"1.6"` (current) / `"1.5"` / `"1.4"` |
| `serialNumber` | recommended | URN UUID identifying the BOM |
| `version` | recommended | BOM revision (incremented per re-issue) |
| `metadata` | recommended | Generation context (timestamp, tools, top-level component) |
| `components[]` | required for non-empty BOMs | Inventory of dependencies |
| `dependencies[]` | recommended | Dependency-graph edges via `bom-ref` |
| `services[]` | optional | Hosted services (SaaS BOM) |
| `vulnerabilities[]` | optional | Per-finding records |
| `formulation[]` | optional | Build metadata |

Component types and per-language native generators are cataloged in
[references/component-types-and-tooling.md](references/component-types-and-tooling.md);
the `purl` (Package URL) field is the canonical component identifier.

## Step 3 - Vulnerability block (VEX-equivalent)

CycloneDX has first-class vuln support (unlike SPDX which delegates
to companion files):

```json
"vulnerabilities": [
  {
    "id": "CVE-2024-1234",
    "source": {"name": "NVD", "url": "https://nvd.nist.gov/vuln/detail/CVE-2024-1234"},
    "ratings": [
      {"source": {"name": "NVD"}, "severity": "critical", "method": "CVSSv3", "score": 9.8}
    ],
    "cwes": [798],
    "description": "Hardcoded credential in lodash sortBy function",
    "affects": [{"ref": "pkg:npm/lodash@4.17.20"}],
    "analysis": {
      "state": "not_affected",
      "justification": "code_not_present",
      "detail": "Vulnerable function not exported in current build"
    }
  }
]
```

The `analysis.state` field uses VEX-equivalent values:
`resolved`, `resolved_with_pedigree`, `exploitable`,
`in_triage`, `false_positive`, `not_affected`.

## Step 4 - Validation

Validate a CycloneDX SBOM against the schema:

```bash
# Using cyclonedx-cli (Anchore-equivalent for CycloneDX)
cyclonedx validate --input-file sbom.json --input-version v1_6

# Or via npm
npx @cyclonedx/cyclonedx-bom validate sbom.json
```

Validation catches structural issues (missing required fields,
invalid PURLs, unknown component types) before publishing.

## Step 5 - VEX integration

CycloneDX 1.4+ supports embedded VEX (Vulnerability Exploitability
Exchange) - assertions about whether a known CVE actually affects
the shipped product.

```json
"vulnerabilities": [{
  "id": "CVE-2024-1234",
  "analysis": {
    "state": "not_affected",
    "justification": "vulnerable_code_not_in_execute_path",
    "detail": "Vulnerable parser only invoked when --debug flag passed; production builds disable --debug",
    "response": ["will_not_fix"]
  },
  "affects": [{"ref": "pkg:npm/lodash@4.17.20"}]
}]
```

VEX assertions allow downstream consumers to filter false-positive
findings from your shipped SBOM rather than re-doing reachability
analysis themselves.

## Step 6 - CI integration

```yaml
jobs:
  cyclonedx:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      # Per-language native (recommended for richer SBOM)
      - run: npx @cyclonedx/cyclonedx-npm --output-file=sbom.cyclonedx.json
      # OR via Syft (broader source coverage)
      - uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.cyclonedx.json
      # Validate
      - run: cyclonedx validate --input-file sbom.cyclonedx.json --input-version v1_6
      # Sign + attest
      - run: cosign attest --predicate sbom.cyclonedx.json --type cyclonedx my-image:1.0
```

## Worked example

A Node.js service must ship a CycloneDX SBOM to a security-focused
customer. The team:

1. Generates the BOM natively:
   `npx @cyclonedx/cyclonedx-npm --output-file=sbom.cyclonedx.json`.
   Output is `bomFormat: "CycloneDX"`, `specVersion: "1.6"`, with a
   `components[]` entry per dependency (each carrying a `purl`) and a
   `dependencies[]` edge list.
2. A scan flags `CVE-2024-1234` on `pkg:npm/lodash@4.17.20`. Triage
   shows the vulnerable function is not in the execute path, so the
   team adds a `vulnerabilities[]` record with
   `analysis.state: "not_affected"` and
   `justification: "vulnerable_code_not_in_execute_path"` (Step 3).
3. Validates:
   `cyclonedx validate --input-file sbom.cyclonedx.json --input-version v1_6` - passes.
4. Attests to the image:
   `cosign attest --predicate sbom.cyclonedx.json --type cyclonedx my-image:1.0`.

Result: a schema-valid, attested CycloneDX 1.6 BOM whose embedded VEX
lets the customer drop the lodash finding without re-doing
reachability analysis.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `serialNumber` field | Can't deduplicate across re-generations | Generate URN UUID per BOM |
| Use `metadata.tools[]` v1.4 schema in 1.6+ | Schema evolution; tools shape changed | Use `metadata.tools.components[]` (newer schema) |
| Skip `dependencies[]` block | Loss of dep-graph info; downstream tools degrade | Always include (Step 1) |
| Hand-author CycloneDX | Schema is large; errors easy to introduce | Use generators ([references](references/component-types-and-tooling.md)) |
| Skip schema validation | Invalid SBOMs pass into prod; downstream consumers fail | Validate in CI (Step 4) |

## Limitations

- Spec is large + evolves; pin schema version per consumer
  agreement.
- Per-language tools have varying quality; some are community-maintained
  + occasionally lag releases.
- VEX assertions are only as good as the analysis behind them;
  unfounded `not_affected` claims are worse than no claim.
- ML / SaaS BOM features are newer (1.5+) and not all tooling
  supports them.

## References

- [cdx-spec][cdx-spec] - official specification
- [references/component-types-and-tooling.md](references/component-types-and-tooling.md) - component types + per-language native tooling
- cyclonedx.org - landing
- github.com/CycloneDX - org with per-language tools
- github.com/package-url/purl-spec - Package URL spec
- openvex.dev - OpenVEX standalone spec (compatible with CycloneDX
  1.4+ embedded VEX)
- `syft-generation`,
  `grype-scanning`,
  `spdx-format`,
  `trivy-image` - sister tools
