# cargo-audit config, binary auditing, and CI

Deep reference for the `cargo-audit-rust` SKILL.md. SKILL.md keeps install, the
basic scan, `--deny` semantics, output formats, `cargo audit fix`, and the
minimal suppression template; this file holds the full `.cargo/audit.toml`
schema, binary auditing, and the GitHub Actions wiring.

[rustsec-readme]: https://github.com/rustsec/rustsec/blob/main/cargo-audit/README.md
[audit-check-action]: https://github.com/rustsec/audit-check

## Full `.cargo/audit.toml` schema

Per the [audit.toml example](https://github.com/rustsec/rustsec/blob/main/cargo-audit/audit.toml.example):

```toml
# .cargo/audit.toml

[advisories]
# Advisory IDs to suppress - each MUST have a reason and expiry tracked in a
# companion comment or issue tracker entry
ignore = ["RUSTSEC-2024-0001"]

# Informational categories to surface as warnings (not hard failures)
informational_warnings = ["unmaintained", "unsound"]

# Minimum CVSS severity to report: "none" | "low" | "medium" | "high" | "critical"
severity_threshold = "medium"

[output]
# "terminal" | "json" | "sarif"
format = "terminal"

# Hard-fail categories (mirrors --deny flags)
deny = ["warnings"]

# Show inverse dependency trees alongside each finding
show_tree = true

[database]
# Skip remote fetch (for offline / air-gapped builds)
fetch = false

# Allow an advisory DB that has not been updated recently
stale = false
```

## Binary auditing

For auditing compiled binaries (e.g. checking a deployed artifact without
source access), install the companion crate and audit the binary
([rustsec-readme][rustsec-readme]):

```bash
# Compile with embedded dependency metadata
cargo install cargo-auditable
cargo auditable build --release

# Audit the compiled binary
cargo audit bin target/release/my-app
```

Binary auditing works best when the binary was compiled with `cargo-auditable`,
which embeds `Cargo.lock` metadata into the ELF/Mach-O/PE section. Binaries
without embedded metadata cannot be audited.

## GitHub Actions CI integration

Use the official [`rustsec/audit-check`][audit-check-action] action, which wraps
`cargo audit`, creates check runs, and (for scheduled workflows) opens GitHub
Issues for each advisory ([audit-check README][audit-check-action]):

```yaml
name: Security audit
on:
  push:
    paths:
      - '**/Cargo.toml'
      - '**/Cargo.lock'
  schedule:
    - cron: '0 0 * * *'

jobs:
  security_audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rustsec/audit-check@v2.0.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          # Optional: comma-separated advisory IDs to suppress
          # ignore: "RUSTSEC-2024-0001,RUSTSEC-2024-0002"
          # Optional: subdirectory with Cargo.toml
          # working-directory: crates/my-crate
```

CI gate behavior ([audit-check-action][audit-check-action]):

- Pass: no security advisories found (informational advisories do not fail the
  check).
- Fail: any security advisory found; the check run is marked failed.
- Scheduled runs create a GitHub Issue per advisory for tracking.

For SARIF upload alongside the action:

```yaml
      - name: Run cargo audit (SARIF)
        run: cargo audit --format sarif > cargo-audit.sarif || true
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: cargo-audit.sarif
```
