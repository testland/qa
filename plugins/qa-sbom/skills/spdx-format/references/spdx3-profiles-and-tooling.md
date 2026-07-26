# SPDX 3.0 profiles and tooling

Extended reference extracted from `spdx-format`. See
[spdx.dev/specifications][spdx-spec] for the source spec.

## SPDX 3.0 profiles

SPDX 3.0 (2024 release) restructures into composable profiles:

| Profile | Use |
|---|---|
| `core` | Minimum BOM model |
| `software` | Software-specific extensions (approx. SPDX 2.3 packages) |
| `licensing` | License identification + expressions |
| `security` | Vulnerability + VEX statements |
| `ai` | AI/ML models, datasets, hyperparameters |
| `dataset` | Dataset-specific metadata |
| `build` | Build provenance (similar to in-toto attestations) |

JSON-LD is the primary encoding; tooling support is growing but
less mature than 2.3 as of 2026. For most teams, stay on SPDX 2.3
unless 3.0 features are required - 2.3 has broader tooling.

## Tooling

| Tool | Use |
|---|---|
| `syft` | Generates SPDX 2.3 (JSON / Tag-Value); cross-source |
| `spdx-tools` | Reference impl (Python); validation + conversion |
| `spdx-tools-java` | Java reference impl |
| `ORT` (OSS Review Toolkit) | License compliance scanning + SPDX reporting |
| `spdx-sbom-generator` | Per-language native generation |
| `tern` | Container image SPDX generation |
| `Trivy` | Cross-purpose scanner with SPDX output |

[spdx-spec]: https://spdx.dev/specifications/
