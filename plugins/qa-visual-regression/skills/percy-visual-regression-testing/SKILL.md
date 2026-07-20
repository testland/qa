---
name: percy-visual-regression-testing
description: "Authors Percy visual snapshot tests via the @percy/cli + framework SDK (Playwright, Cypress, Selenium, Storybook), runs them with `percy exec -- {test command}`, configures viewports / masking / ignored regions, and reviews diffs in the Percy build UI. Use when the project ships visual regression coverage to BrowserStack Percy."
---

# percy-visual-regression-testing

## Overview

Percy is BrowserStack's visual testing platform. The integration shape is
two-layered: **the CLI** (`@percy/cli`) plus **a framework SDK**
(`@percy/playwright`, `@percy/cypress`, `@percy/selenium`,
`@percy/storybook`, etc. - the [Percy CLI README][percy-cli] lists the
available SDKs as Playwright, Cypress, Selenium, Storybook, Puppeteer,
Appium, plus framework-specific wrappers like Ember, Gatsby, Jekyll, and
a custom SDK option).

[percy-cli]: https://github.com/percy/cli
[percy-playwright]: https://github.com/percy/percy-playwright
[percy-exec]: https://github.com/percy/cli/tree/master/packages/cli-exec
[percy-config]: https://github.com/percy/cli/tree/master/packages/config

The CLI starts a local snapshot server, the SDK calls
`percySnapshot(page, name)` from inside your tests, and the build appears
in the Percy UI for baseline review.

## When to use

- The repo already uses Percy (presence of `@percy/*` packages, `.percy.yml`,
  or `PERCY_TOKEN` in CI secrets).
- The project wants visual diffs reviewed in a hosted UI (vs. self-hosted
  Playwright snapshots) and uses BrowserStack for cross-browser coverage.
- A team needs the AI-summary / noise-filtering review flow that Percy
  provides on top of raw pixel diffs.

If the project does not already use BrowserStack, evaluate
[`chromatic-visual-regression-testing`](../chromatic-visual-regression-testing/SKILL.md)
(Storybook-first) or [`playwright-snapshots`](../playwright-snapshots/SKILL.md)
(self-hosted) before adopting Percy.

## Authoring snapshots

### Install (Playwright example)

```bash
npm install --save-dev @percy/cli @percy/playwright
```

Both packages are required: `@percy/cli` runs the local snapshot server,
`@percy/playwright` exposes the `percySnapshot` function ([percy-playwright][percy-playwright]).

### Snapshot in a Playwright test

```javascript
const { chromium } = require('playwright');
const percySnapshot = require('@percy/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://example.com/', { waitUntil: 'networkidle2' });
  await percySnapshot(page, 'Example Site');
  await browser.close();
})();
```

(Adapted from [percy-playwright][percy-playwright].)

### Options to `percySnapshot(page, name, options)`

Per the [percy-playwright README][percy-playwright]:

| Option                    | Effect                                                |
|---------------------------|-------------------------------------------------------|
| `percyCSS`                | CSS injected immediately before the screenshot. Use this to neutralize timestamps, ad slots, or animations. |
| `fullPage`                | Capture the entire scrollable page rather than the viewport. |
| `freezeAnimatedImage`     | Freeze animated images (GIF / APNG) so the diff is deterministic. |
| `ignoreRegionSelectors`   | CSS selectors whose bounding boxes are excluded from the diff. |
| `customIgnoreRegions`     | Coordinate-based exclusion zones for ad-hoc cases.   |

Other SDKs (`@percy/cypress`, `@percy/selenium`, `@percy/storybook`)
expose the same shape with framework-specific calling conventions - 
check the matching SDK README on github.com/percy.

### Configuration file

The Percy CLI looks for config in this order ([percy-config][percy-config]):

1. `"percy"` block in `package.json`
2. `.percyrc` (YAML or JSON)
3. `.percy.json`
4. `.percy.yaml` / `.percy.yml`
5. `.percy.js` / `percy.config.js`

The first found wins, searched from CWD up to the home directory. Use this
file to set project-wide defaults (viewports, percyCSS, network idle
timeout). For the current schema of the snapshot block (widths array,
minimum height, etc.), check the latest [percy-cli][percy-cli] release - 
the schema evolves with major versions and reproducing it from memory
risks drift.

## Running

The canonical invocation is `percy exec -- <test command>`
([percy-exec][percy-exec]):

```bash
export PERCY_TOKEN=<your project token>
percy exec -- npx playwright test
percy exec -- yarn cypress run
percy exec -- npx jest
```

`percy exec` starts a local snapshot server on port 5338 (configurable),
proxies snapshot requests from the SDK during the test run, and finalizes
the build when the wrapped command exits ([percy-exec][percy-exec]).

### Useful `percy exec` flags

Per [percy-exec][percy-exec]:

| Flag                          | Purpose                                                    |
|-------------------------------|------------------------------------------------------------|
| `--parallel`                  | Mark the build as part of a parallel CI matrix.           |
| `--partial`                   | Allow the build to be marked partial (e.g. early exit).   |
| `-P`, `--port <n>`            | Override the local server port (default `5338`).          |
| `-d`, `--dry-run`             | Capture snapshots locally without uploading.              |
| `-h`, `--allowed-hostname`    | Restrict asset discovery to specific hostnames.           |
| `--disallowed-hostname`       | Inverse of allowed; useful for blocking analytics URLs.   |
| `-t`, `--network-idle-timeout <ms>` | Tune asset-discovery timing for slow apps.          |
| `--debug`                     | Verbose logging for troubleshooting.                       |

`PERCY_TOKEN` is the only required env var ([percy-cli][percy-cli]); the
SDK no-ops when the token is absent (so tests stay green locally without
a token).

## Reviewing diffs

A successful Percy build appears in the Percy UI grouped by snapshot
name; visual changes between commits appear as side-by-side diffs that
require **explicit approval** before the build is marked passed. Percy
also integrates with PR statuses so a build with unapproved changes
shows as `pending` on the PR until a reviewer approves
([percy-overview][percy-overview]).

[percy-overview]: https://www.browserstack.com/docs/percy

The newer "AI Agents" mode generates natural-language summaries of
visual changes and reduces noise on cosmetically-irrelevant diffs
([percy-overview][percy-overview]); this is opt-in per project.

## CI integration

The minimal pattern: install `@percy/cli` + the SDK, expose
`PERCY_TOKEN` as a CI secret, wrap the test command in `percy exec`.

```yaml
# .github/workflows/visual.yml
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Percy + Playwright
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
        run: npx percy exec -- npx playwright test
```

For a parallel CI matrix (e.g. sharded Playwright tests), add `--parallel`
to `percy exec` and use Percy's parallel-build coordinator
([percy-exec][percy-exec]).

## References

- [percy-cli][percy-cli] - main CLI package; install instructions and
  supported SDKs.
- [percy-playwright][percy-playwright] - Playwright SDK with
  `percySnapshot` options.
- [percy-exec][percy-exec] - `percy exec` flags and behavior.
- [percy-config][percy-config] - config file resolution order.
- [percy-overview][percy-overview] - Percy product overview, build review
  flow, AI Agents mode.
