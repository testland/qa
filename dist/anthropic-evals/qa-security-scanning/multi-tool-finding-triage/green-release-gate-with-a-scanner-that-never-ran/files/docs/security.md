# Security scanning

Four scanners run on every push and pull request, and a fifth job merges their
reports into one verdict:

| Tool     | Domain                  | Config           | Added   |
|----------|-------------------------|------------------|---------|
| semgrep  | static analysis         | `.semgrep.yml`   | 2024-02 |
| trivy    | dependencies + SBOM     | `trivy.yaml`     | 2024-02 |
| gitleaks | secrets                 | `.gitleaks.toml` | 2024-06 |
| checkov  | terraform under `infra/` | `.checkov.yaml` | 2026-05 |

The gate blocks the build on any finding at or above the configured threshold.
The threshold is `critical`.

## Backlog

- Look at whether a dynamic scan is worth it for the admin console. Nobody has
  picked this up: there is no config for one in the repo and it does not run in
  any pipeline.
