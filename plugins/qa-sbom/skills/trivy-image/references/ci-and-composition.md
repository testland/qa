# trivy-image CI integration and tool composition

Extracted from `trivy-image`. The SKILL.md spine keeps the scan commands
inline; the full CI workflow and the sister-tool composition table live here.

## CI integration

```yaml
jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t my-app:${{ github.sha }} .
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: my-app:${{ github.sha }}
          format: sarif
          output: trivy.sarif
          severity: CRITICAL,HIGH
          ignore-unfixed: true
          exit-code: 1
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: trivy.sarif }
```

The `aquasecurity/trivy-action` GHA wraps the CLI plus SARIF upload.

## Composition with sister tools

| Sister tool | Use |
|---|---|
| `syft-generation` | Generates standalone SBOM (Trivy embeds SBOM gen but exposes it less) |
| Grype (`syft-generation` Step 7) | Alternative scanner; cross-DB consensus on findings |
| `sbom-formats` | Reference for the SBOM formats Trivy outputs |
| `checkov-policy` | Cross-plugin: deeper IaC scanning vs Trivy's image-internal misconfig |
