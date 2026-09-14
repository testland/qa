# Security scanning

Five scanners run on every push and pull request, and a sixth job merges their
reports into one verdict:

| Tool       | Domain                   | Config             | Added   |
|------------|--------------------------|--------------------|---------|
| semgrep    | static analysis          | `.semgrep.yml`     | 2024-02 |
| trivy      | dependencies + SBOM      | `trivy.yaml`       | 2024-02 |
| gitleaks   | secrets                  | `.gitleaks.toml`   | 2024-06 |
| checkov    | terraform under `infra/` | `.checkov.yaml`    | 2026-05 |
| trufflehog | secrets                  | `.trufflehog.yaml` | 2026-08 |

The gate blocks the build on any finding at or above the configured threshold.
The threshold is `critical`.

`.env.example` is the committed template for local development. The values in it
are documentation examples, not credentials, and the file is allowlisted in
`.gitleaks.toml` for the `generic-api-key` rule only.

## Backlog

- Dynamic scan of the admin console. Proposed after the March review; SEC-812 is
  open and unassigned.
