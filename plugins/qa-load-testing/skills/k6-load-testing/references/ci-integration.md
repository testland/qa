# k6 CI integration

A GitHub Actions workflow that installs k6 from the official apt repository,
runs the load test on pull requests that touch `tests/load/**` and on a nightly
schedule, and uploads the JSON summary. A failing threshold causes `k6 run` to
exit non-zero and fail the job; the summary artifact is uploaded regardless via
`if: always()`.

```yaml
# .github/workflows/load-test.yml
name: load-test

on:
  pull_request:
    paths:
      - 'tests/load/**'
  schedule:
    - cron: '0 4 * * *'   # nightly soak

jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run k6 test
        env:
          API_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
          API_TOKEN:    ${{ secrets.STAGING_API_TOKEN }}
        run: |
          k6 run \
            --summary-export=summary.json \
            --quiet \
            tests/load/orders.js

      - name: Upload summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-summary
          path: summary.json
          retention-days: 14
```

Pin a specific k6 version in CI for determinism rather than tracking `stable`.
