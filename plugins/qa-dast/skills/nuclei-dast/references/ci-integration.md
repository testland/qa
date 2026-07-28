# Nuclei CI integration

Full GitHub Actions workflow for `nuclei-dast` Step 9. Runs a severity-gated scan
on staging, fails the job on any finding, and uploads the report as an artifact.

```yaml
jobs:
  nuclei-dast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Install Nuclei
        run: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

      - name: Update templates
        run: nuclei -update-templates

      - name: Run Nuclei scan
        run: |
          nuclei \
            -u ${{ vars.STAGING_URL }} \
            -severity high,critical \
            -rl 50 \
            -j -o nuclei-report.jsonl

      - name: Gate on findings
        run: |
          count=$(wc -l < nuclei-report.jsonl 2>/dev/null || echo 0)
          echo "Nuclei findings: $count"
          [ "$count" -eq 0 ]

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nuclei-report
          path: nuclei-report.jsonl
```

## SARIF upload to Code Scanning

Use `-se nuclei.sarif` and the `github/codeql-action/upload-sarif` action to
surface findings inline in pull request diffs.
