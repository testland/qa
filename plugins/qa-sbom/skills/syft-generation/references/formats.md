# Syft output formats and source types

Full catalogs extracted from `syft-generation`. Per
[github.com/anchore/syft][sf-gh], Syft supports multiple SBOM output formats
and scan-source types; the SKILL.md spine keeps the common ones inline and
links here for the complete tables.

[sf-gh]: https://github.com/anchore/syft

## Output format catalog

| Format | Use |
|---|---|
| `cyclonedx-json` | CycloneDX 1.5+ JSON; broad ecosystem support |
| `cyclonedx-xml` | CycloneDX XML (older toolchains) |
| `spdx-json` | SPDX 2.3 JSON; preferred by US Federal procurement |
| `spdx-tag-value` | SPDX tag-value format (legacy) |
| `syft-json` | Syft-native JSON; richest metadata |
| `table` | Human-readable terminal table (default) |
| `github-json` | GitHub dependency-graph submission format |

For `grype-scanning` input, use `syft-json` (richest metadata) or
`cyclonedx-json` (broader compat). For compliance delivery, the consumer's
requirement dictates: SPDX-JSON for US federal, CycloneDX-JSON for most EU
contexts.

## Source types

| Source | Syntax |
|---|---|
| Local Docker daemon | `syft alpine:latest` |
| OCI / remote registry | `syft registry:docker.io/alpine:latest` |
| OCI archive (tar) | `syft oci-archive:./image.tar` |
| Docker archive (tar) | `syft docker-archive:./image.tar` |
| Local directory | `syft dir:./my-project` (or `syft ./my-project`) |
| File | `syft file:./pom.xml` |
| Singularity image | `syft singularity:./image.sif` |
