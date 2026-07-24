---
name: storybook-visual-regression-testing
description: "Sets up visual regression coverage for a Storybook project - either via the official @chromatic-com/storybook addon (hosted) or via @storybook/test-runner with a postVisit hook that calls Playwright's toHaveScreenshot (self-hosted). Covers test-runner install, lifecycle hooks (setup / preVisit / postVisit), and CI integration. Use when a repo already has a working `.storybook/` config and the team wants per-story visual coverage rather than page-level snapshots."
---

# storybook-visual-regression-testing

## Overview

Storybook ships two officially-supported paths to visual regression
testing:

1. **Hosted (Chromatic addon).** Install
   `@chromatic-com/storybook`; every story becomes a Chromatic snapshot
   automatically. Review happens in the Chromatic UI. This is the
   default recommendation in the [Storybook visual-testing docs][st-vt].
2. **Self-hosted (test-runner + Playwright snapshots).** Install
   `@storybook/test-runner` and add a `postVisit` hook that calls
   `expect(page).toHaveScreenshot()`. Baselines live in the repo, no
   external service.

[st-vt]: https://storybook.js.org/docs/writing-tests/visual-testing
[st-tr]: https://storybook.js.org/docs/writing-tests/integrations/test-runner

This skill covers both. For full Chromatic CLI behavior (TurboSnap,
exit codes, config file), pair with
`chromatic-visual-regression-testing`;
for `toHaveScreenshot` option syntax, pair with
`playwright-snapshots`.

## When to use

- The repo has `.storybook/` with a working Storybook config.
- The team wants per-story visual coverage (atom-level), not page-level
  coverage.
- Either: the team is already paying for / using Chromatic (path 1), or
  the team prefers committed-to-repo baselines (path 2).

## Path 1 - Hosted via Chromatic addon

### Install

```bash
npm install --save-dev @chromatic-com/storybook
```

(Per [storybook-visual-testing][st-vt].)

### Activate

The addon registers itself in Storybook on next start. Sign into
Chromatic from the Storybook UI, link the project, then click "Catch a
UI change" to capture the **first baseline** ([storybook-visual-testing][st-vt]).

After the first baseline, every story functions as a visual test
automatically - no per-story `parameters` block, no custom assertion
code.

### CI integration

Chromatic CI invocation is identical to running it standalone - see
`chromatic-visual-regression-testing`
for the `npx chromatic` CLI flag set, exit codes, TurboSnap, and
`chromatic.config.json` schema.

## Path 2 - Self-hosted via test-runner

### Install

```bash
npm install --save-dev @storybook/test-runner
```

(Per [storybook-test-runner][st-tr].)

Add the script to `package.json`:

```json
{
  "scripts": {
    "test-storybook": "test-storybook"
  }
}
```

### How it works

`@storybook/test-runner` turns every story into an executable test
powered by Jest + Playwright under the hood ([storybook-test-runner][st-tr]).
It requires a Storybook running on a discoverable URL (default
`http://localhost:6006`) or a published Storybook static build.

### Lifecycle hooks

Configure in `.storybook/test-runner.ts` - three hooks
([storybook-test-runner][st-tr]):

| Hook                      | When                                    | Use for                                          |
|---------------------------|------------------------------------------|--------------------------------------------------|
| `setup()`                 | Once, before all tests                   | One-time setup (e.g. starting a mock server).    |
| `preVisit(page, context)` | Before each story renders in the browser | Set viewport, inject auth, mock APIs.            |
| `postVisit(page, context) | After each story has fully rendered      | Visual snapshot, accessibility audit, custom assertion. |

`context` carries `id`, `title`, and `name` for the current story.

### Visual regression via postVisit + Playwright snapshots

`.storybook/test-runner.ts`:

```typescript
import type { TestRunnerConfig } from '@storybook/test-runner';
import { expect } from '@playwright/test';
import { getStoryContext } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    // Skip stories explicitly opted out
    const storyContext = await getStoryContext(page, context);
    if (storyContext.parameters?.visualRegression?.disable) return;

    // Locate the story's root element and snapshot it
    const root = page.locator('#storybook-root');
    await expect(root).toHaveScreenshot(
      `${context.id}.png`,
      { animations: 'disabled', mask: [page.locator('[data-mask]')] }
    );
  },
};

export default config;
```

This captures one PNG per story under
`tests/__snapshots__/<context.id>.png` (or the path your
`playwright.config.ts` `snapshotPathTemplate` resolves to). Per-story
opt-out via a story `parameters.visualRegression.disable = true`.

For the full `toHaveScreenshot` option set (mask, threshold,
maxDiffPixels, etc.) and the per-OS / per-browser baseline structure,
see `playwright-snapshots`.

### Running

Two-step: start Storybook, then run the test-runner against it
([storybook-test-runner][st-tr]):

```bash
# Terminal A - long-running
npm run storybook

# Terminal B
npm run test-storybook
```

For CI, build a static Storybook and serve it locally during the test
run:

```bash
npx storybook build && \
  npx http-server storybook-static --port 6006 --silent &
SERVER_PID=$!
npx wait-on http://localhost:6006
npm run test-storybook
kill $SERVER_PID
```

The `wait-on` step is important - `test-storybook` will fail
unhelpfully if the server is not up before it starts.

## Choosing between paths

| Question                                                  | Path 1 (Chromatic) | Path 2 (self-hosted) |
|-----------------------------------------------------------|:------------------:|:--------------------:|
| Want a hosted UI for diff review?                         | ✅                 | ❌                  |
| Need TurboSnap (story-aware change detection)?            | ✅                 | ❌                  |
| Want baselines committed to the repo?                     | ❌                 | ✅                  |
| Acceptable to add a paid SaaS dependency?                 | ✅                 | ❌ (free)           |
| Cross-browser baselines?                                  | ✅ built-in       | ⚠️ via Playwright projects, locally |
| Per-story opt-out granularity?                            | ✅ via `parameters.chromatic.disableSnapshot` | ✅ via `parameters.visualRegression.disable` |

A common mid-size setup: **Path 1 in CI**, with **Path 2 for local
authoring** so engineers can iterate without consuming Chromatic
snapshot quota.

## CI integration

For Path 2, the workflow is the standard test-runner pattern with
Playwright browsers installed:

```yaml
# .github/workflows/storybook-visual.yml
name: storybook-visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test-storybook:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build Storybook
        run: npx storybook build

      - name: Serve + test
        run: |
          npx concurrently -k -s first -n "SB,TEST" -c "magenta,blue" \
            "npx http-server storybook-static --port 6006 --silent" \
            "npx wait-on http://localhost:6006 && npm run test-storybook"

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: storybook-test-runner-report
          path: |
            test-results/
            playwright-report/
          retention-days: 14
```

`concurrently -k -s first` ensures the server is killed when the test
process exits - without `-k`, the workflow hangs.

## References

- [storybook-visual-testing][st-vt] - official Chromatic addon path
  for visual coverage.
- [storybook-test-runner][st-tr] - `@storybook/test-runner` install,
  lifecycle hooks, integration with Jest + Playwright.
- `chromatic-visual-regression-testing` - Chromatic CLI behavior, exit codes, TurboSnap.
- `playwright-snapshots` - full
  `toHaveScreenshot` options for Path 2.
