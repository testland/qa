# CI workflow YAML

Full GitHub Actions workflows for the three-layer DAST cadence (Step 4 of
`dast-scan-cadence-author`). Copy the file that matches each cadence layer.

## PR-blocking baseline

```yaml
# .github/workflows/dast.yml
on:
  pull_request:
    branches: [main]

jobs:
  zap-baseline-pr:
    name: DAST baseline (PR-blocking)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: zaproxy/action-baseline@v0.13.0
        with:
          target: ${{ secrets.STAGING_URL }}
          rules_file_name: '.zap/rules.tsv'
      - run: python ci/dast-pr-gate.py current.json .zap/baseline-findings.json
```

## Nightly full active scan

```yaml
# .github/workflows/dast-nightly.yml
on:
  schedule:
    - cron: '0 2 * * *'   # 2 AM daily
  workflow_dispatch:

jobs:
  zap-full-scan:
    name: DAST active full scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: zaproxy/action-full-scan@v0.13.0
        with:
          target: ${{ secrets.STAGING_URL }}
      - name: Upload report
        uses: actions/upload-artifact@v4
        with: { name: zap-full-report, path: report_html.html }

  nightvision:
    name: DAST API spec scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: ./ci/run-nightvision.sh
```

## Per-release deep scan

```yaml
# .github/workflows/dast-release.yml
on:
  release:
    types: [created]
  workflow_dispatch:

jobs:
  burp-deep:
    name: Burp deep scan (per-release)
    runs-on: self-hosted    # Burp Enterprise lives on internal infra
    steps:
      - run: ./ci/burp-enterprise-trigger.sh
```
