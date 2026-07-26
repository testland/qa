# Cypress Cloud + CI integration

Operational detail split out of `cypress-testing`. The core authoring
loop (config, specs, custom commands, the time-travel debugger) stays
in SKILL.md; this file holds the recording / parallelization and the
CI wiring.

## Cypress Cloud (paid; optional)

```bash
# Record run to Cypress Cloud
npx cypress run --record --key <CYPRESS_RECORD_KEY>

# Parallel
npx cypress run --record --parallel
```

Cloud provides:
- Parallel execution across N CI jobs.
- Recording (replay any test from anywhere).
- Per-test analytics.
- Flaky-test detection.

OSS alternative: `currents-integration` (in the qa-test-reporting
plugin) covers similar analytics for both Cypress + Playwright.

## CI integration (GitHub Actions)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          browser: chrome
          record: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```
