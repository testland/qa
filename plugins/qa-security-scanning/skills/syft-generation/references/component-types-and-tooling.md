# CycloneDX component types and per-language tooling

Reference tables extracted from `cyclonedx-format`. See
[cyclonedx.org/specification/overview][cdx-spec] for the source spec.

## Component types

Per [cdx-spec][cdx-spec] common component types:

| Type | Use |
|---|---|
| `application` | Top-level app being described |
| `library` | Code dependency (npm, pip, Maven artifact) |
| `framework` | Application framework (React, Django, Spring) |
| `container` | OCI/Docker container image |
| `operating-system` | OS (Alpine, Ubuntu, etc.) |
| `firmware` | Embedded firmware |
| `device` | Hardware device |
| `file` | Standalone file (script, binary) |
| `machine-learning-model` | ML model (since 1.5) |
| `data` | Dataset (since 1.5) |
| `cryptographic-asset` | Crypto algorithm/key (since 1.6) |

The `purl` (Package URL) field is the canonical identifier per
[github.com/package-url/purl-spec](https://github.com/package-url/purl-spec).

## Per-language native tooling

CycloneDX has per-language native generators (alternative to Syft):

| Language | Tool | Source |
|---|---|---|
| Node.js | `@cyclonedx/cyclonedx-npm` | github.com/CycloneDX/cyclonedx-node-npm |
| Python | `cyclonedx-py` (`cyclonedx-bom`) | github.com/CycloneDX/cyclonedx-python |
| Java/Maven | `cyclonedx-maven-plugin` | github.com/CycloneDX/cyclonedx-maven-plugin |
| Java/Gradle | `cyclonedx-gradle-plugin` | github.com/CycloneDX/cyclonedx-gradle-plugin |
| Go | `cyclonedx-gomod` | github.com/CycloneDX/cyclonedx-gomod |
| .NET | `CycloneDX-DOTNET` | github.com/CycloneDX/cyclonedx-dotnet |
| Rust | `cargo-cyclonedx` | github.com/CycloneDX/cyclonedx-rust-cargo |

Per-language tools often produce richer SBOMs than Syft (deeper
metadata, language-specific quirks handled).

[cdx-spec]: https://cyclonedx.org/specification/overview/
