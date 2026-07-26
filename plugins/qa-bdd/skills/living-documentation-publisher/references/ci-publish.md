# Publish living documentation to Pages (CI)

Publishes the generated HTML report to GitHub or GitLab Pages so stakeholders
get a URL, not a zip file. Referenced from
[living-documentation-publisher](../SKILL.md) Step 6.

## GitHub Actions

```yaml
name: Living Documentation

on:
  push:
    branches: [main]

jobs:
  publish-docs:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run tests and generate report
        run: |
          npm ci
          npm test
          node scripts/generate-report.js

      - name: Publish to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/living-documentation
```

For Serenity (JVM), replace the generate step and point `publish_dir` at
`target/site/serenity`.

## GitLab Pages

```yaml
pages:
  stage: deploy
  script:
    - npm ci
    - npm test
    - node scripts/generate-report.js
    - mkdir -p public
    - cp -r docs/living-documentation/* public/
  artifacts:
    paths:
      - public
  only:
    - main
```

See `github-actions-test-jobs` (in the qa-ci-integration plugin) for general
CI test-job conventions.
