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
      - uses: actions/checkout@v7
      # node 24 for install/start commands; the action itself runs node24
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - uses: cypress-io/github-action@v7
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
          browser: chrome
          record: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

Per the [github-action README][gha], `v7` "is the action's recommended
major version", `record: true` records to Cypress Cloud, and "The record
key is passed to the action as an environment variable
`CYPRESS_RECORD_KEY`". The README also points to `actions/setup-node` for
pinning the Node.js version that the `start` and install commands use;
per the [Cypress changelog][cychangelog], Cypress 16 needs Node.js 22, 24
or 26+.

[gha]: https://github.com/cypress-io/github-action
[cychangelog]: https://docs.cypress.io/app/references/changelog
