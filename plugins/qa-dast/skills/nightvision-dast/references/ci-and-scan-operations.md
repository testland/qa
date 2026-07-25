# NightVision CI gating and scan operations

Deep reference for the nightvision-dast SKILL.md. Consult when wiring a
NightVision scan into CI as a SARIF gate, or when tuning scope control and
output formats to keep scans focused and within budget.

[nv-docs]: https://docs.nightvision.net/

## CI integration - GitHub Actions

Run the scan against staging on push, export SARIF, and upload it to GitHub
Code Scanning so findings surface inline on the pull request:

```yaml
jobs:
  nightvision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          curl -fsSL https://install.nightvision.net | sh
          nightvision login --token ${{ secrets.NV_TOKEN }}
          SCAN_ID=$(nightvision scan create \
            --name "ci-${{ github.run_id }}" \
            --target-url https://staging.example.com \
            --spec ./openapi.yaml \
            --auth header \
            --auth-header "Authorization: Bearer ${{ secrets.STAGING_TOKEN }}" \
            --output json | jq -r '.id')
          nightvision scan get $SCAN_ID --wait
          nightvision scan results $SCAN_ID --output sarif > nightvision.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: nightvision.sarif }
```

Exact CLI verb names per [nv-docs][nv-docs] current release. Pin a CLI
version in CI so a scanner update never silently changes results, and pass
the auth token from a CI secret (never inline) so it stays out of logs.

## Scope control

Per [nv-docs][nv-docs] "Scope Control" defines:

- Include patterns (URL globs in scope).
- Exclude patterns (URL globs out of scope; e.g., `/admin/*` for
  admin-protected zones, `/static/*` for non-app assets).
- Per-method exclude (e.g., skip DELETE on `/users/*`).
- Per-finding-type include/exclude.

Tightening scope is essential - un-scoped scans hit unintended endpoints and
waste scan budget. Configure it before the first CI run, not after a scan
has already probed out-of-scope URLs.

## Output formats

`nightvision scan results <id> --output FORMAT`:

- `json` - for cross-tool finding aggregation.
- `sarif` - for GitHub Code Scanning (the CI gate above).
- `csv` - for spreadsheet review.
- `pdf` - for compliance reports.
