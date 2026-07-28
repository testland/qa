# Newman reference

Companion to the postman-collections skill: the full flag table, the CI
workflow, and the anti-pattern catalog. Flags and reporters per
[newman-readme](https://github.com/postmanlabs/newman).

## Key flags

| Flag                            | Purpose                                                  |
|---------------------------------|----------------------------------------------------------|
| `-e, --environment <source>`    | Postman environment file (path or URL).                  |
| `-d, --iteration-data <source>` | Data file for iterations: JSON or CSV.                   |
| `-r, --reporters <name>`        | Comma-separated list: `cli,json,junit,html` (htmlextra). |
| `--bail [folder\|failure]`      | Stop on first error; modifier scopes the bail trigger.   |
| `--reporter-junit-export <path>`| Where to write the JUnit XML (when `junit` reporter).    |
| `--reporter-json-export <path>` | Where to write the JSON summary.                          |
| `--timeout-request <ms>`        | Per-request timeout.                                     |
| `--insecure`                    | Disable TLS verification (use only against test servers).|
| `--delay-request <ms>`          | Delay between requests; helps when the server has rate limits. |

## CI integration (GitHub Actions)

```yaml
# .github/workflows/api-tests.yml
name: api-tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  newman:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Newman run
        env:
          API_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
          API_TOKEN:    ${{ secrets.API_TOKEN }}
        run: |
          npx newman run collections/orders.postman_collection.json \
            -e environments/staging.postman_environment.json \
            -r cli,json,junit \
            --reporter-junit-export results.xml \
            --reporter-json-export results.json \
            --bail failure \
            --timeout-request 10000

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: newman-reports
          path: |
            results.xml
            results.json
          retention-days: 14

      - name: Surface JUnit results in summary
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: API tests
          path: results.xml
          reporter: java-junit
```

`if: always()` on both the upload and reporter steps is critical - when a
collection fails, the reports are exactly when you need them.

## Anti-patterns

| Anti-pattern                                            | Why it fails                                              | Fix |
|---------------------------------------------------------|-----------------------------------------------------------|-----|
| Hard-coded environment URLs in the collection JSON       | Collection breaks across staging / prod / local.         | Move to `*.postman_environment.json` files; pass via `-e`. |
| Storing API tokens in the collection JSON                 | Tokens leak into git.                                     | Use environment files committed without secrets, or pull tokens from CI env vars referenced as `{{API_TOKEN}}`. |
| Running collections in PR CI against production           | Tests pollute prod data; rate limits trip; observability noise. | Always run against a staging or ephemeral env. |
| Sequential `pm.test` blocks that share state              | One failure cascades into N false positives.             | Each request's tests should be independent - use `pm.collectionVariables` to share derived data, not assertion state. |
| One giant collection with 200 requests                    | Newman runs serially; CI time grows linearly.            | Split into per-domain collections; parallelize at the CI matrix level. |
| Missing `--bail` in CI                                    | Newman runs all requests even after a failure; noisy logs. | Use `--bail failure` for fast feedback; `--bail folder` to scope the bail to a logical group. |
