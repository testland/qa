---
name: currents-integration
description: Wires Currents.dev test analytics into a Playwright test run — installs `@currents/playwright`, authors a `currents.config.ts` with `recordKey` (env-sourced) and `projectId`, registers `currentsReporter()` in `playwright.config.ts`, enables `trace: "on" / video: "on" / screenshot: "on"` artifacts, and runs via `npx pwc` (Currents-aware Playwright wrapper) so per-test traces / videos / screenshots stream to the Currents dashboard with longitudinal trends. Use when a Playwright suite needs over-time test-suite-health analytics ("test suite over time, and more") that the per-run HTML reporter can't provide.
rating: 23
d6: 4
archetype: S1
---

# currents-integration

## Overview

Per [currents-docs][currents]:

[currents]: https://docs.currents.dev/

> "Playwright reports explain a single run. Currents explains your
> test suite over time, and more."

Currents.dev is a SaaS test analytics platform that ingests
per-run results via runner-specific reporters and provides
longitudinal views (flake rate over time, slowest-test trends,
PR-level deltas). It's commonly paired with **Playwright** and
**Cypress**.

This skill covers the **Playwright** integration; the Cypress
integration follows the same shape with `@currents/cypress` instead.

## When to use

- A Playwright suite has 100+ tests and the team needs over-time
  analytics: which tests flake, which tests slow down across PRs,
  which tests fail on certain CI runners only.
- The team wants per-PR test diffs (this PR's failures vs main's
  failures) without building a custom dashboard.
- The team is on Cypress (use `@currents/cypress` with the same
  shape).

If the suite is small (<50 tests) and the team only needs the
per-run report, Playwright's built-in HTML reporter is enough — no
SaaS dependency.

## Step 1 — Install

Per [currents-pw-quickstart][cqs]:

[cqs]: https://docs.currents.dev/getting-started/your-first-playwright-run.md

```bash
npm i -D @currents/playwright
# Equivalent for pnpm / yarn / bun.
```

## Step 2 — Author `currents.config.ts`

Place next to `playwright.config.ts`. Per [currents-pw-quickstart][cqs]:

```typescript
import { CurrentsConfig } from "@currents/playwright";

const config: CurrentsConfig = {
  recordKey: process.env.CURRENTS_RECORD_KEY!,
  projectId: "your project id goes here",
};

export default config;
```

The `recordKey` is the project's record-write secret — **never check
it into the repo**. The `projectId` is non-secret (visible in the
Currents dashboard URL); it's safe to inline.

## Step 3 — Register the reporter in `playwright.config.ts`

Per [currents-pw-quickstart][cqs]:

```typescript
import { defineConfig } from "@playwright/test";
import { currentsReporter } from "@currents/playwright";

export default defineConfig({
  reporter: [currentsReporter()],
  // ... other config ...
});
```

The reporter forwards every test event (start, finish, attachments)
to the Currents API.

## Step 4 — Enable artifacts

Per [currents-pw-quickstart][cqs], the `use` section should enable
the three artifact types Currents consumes:

```typescript
use: {
  trace: "on",
  video: "on",
  screenshot: "on",
}
```

The defaults Playwright ships with (`trace: "on-first-retry"`) cap
the artifact volume; Currents wants every test's trace to drive
its analytics. For a high-volume suite, consider `trace: "retain-on-failure"`
as a middle ground.

## Step 5 — Run

Per [currents-pw-quickstart][cqs]:

```bash
# Reads recordKey from env, projectId from config:
npx pwc

# Or pass on the CLI:
npx pwc --key XXX --project-id YYY
```

`pwc` is the Currents-aware Playwright wrapper. It runs Playwright
with the Currents reporter active and streams results in real-time;
on completion, it prints a dashboard URL.

## Step 6 — CI integration

```yaml
# .github/workflows/e2e.yml
name: e2e
on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests with Currents
        env:
          CURRENTS_RECORD_KEY: ${{ secrets.CURRENTS_RECORD_KEY }}
        run: npx pwc

      - name: Upload Playwright HTML report (fallback)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

`if: always()` on the artifact upload preserves the local report
even when the Currents stream succeeds — useful when the
dashboard is unreachable.

## Step 7 — Per-PR vs main runs

The Currents dashboard separates main runs (baseline) from PR runs
(comparison). For the analytics to make sense:

- **Main**: every push to main records a run. This becomes the
  baseline for trend graphs.
- **PR**: every PR push records a run; the dashboard cross-references
  by test name to identify "this PR introduced the flake on
  `cart.spec.ts:42`".

Set the CI workflow's branch + PR triggers (Step 6 example) to
record both.

## Step 8 — Cypress shape (sister skill, same pattern)

For completeness — the Cypress integration follows the same shape:

```bash
npm i -D @currents/cypress
```

Then in `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';
import { currentsConfig } from '@currents/cypress';

export default defineConfig({
  ...currentsConfig({
    recordKey: process.env.CURRENTS_RECORD_KEY!,
    projectId: 'your-project-id',
  }),
});
```

Run via `npx cypress-cloud run` (the Cypress equivalent of `pwc`).

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                              | Fix |
|--------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hardcoding `recordKey` in `currents.config.ts`                     | Secret leaks into git; bad actors can pollute the dashboard.              | Read from env (Step 2). |
| Running both Playwright's default HTML reporter and `currentsReporter` without artifact handling | Doubled artifact size; CI runner disk pressure. | Keep both reporters; rely on `if: always()` upload (Step 6). |
| Sending production / staging real-user CI runs to Currents          | Mixes test signal with monitoring signal; analytics pollute.              | Send only test runs; production observability lives elsewhere. |
| Disabling `trace: "on"` to "save space"                              | Currents's value is per-test trace inspection; disabled traces gut the analytics. | Use `retain-on-failure` as a middle ground (Step 4). |
| Recording PR runs without recording main runs                        | No baseline; per-PR diff is meaningless.                                   | Record main on every push too (Step 6). |
| Treating `pwc`'s exit code as gate-only                              | The dashboard surfaces flake / regression context the CI exit code hides. | Read both: pass/fail from CI; flake / regression from the dashboard or its API. |

## Limitations

- **SaaS dependency.** Currents is a managed service. Air-gapped
  / offline CI can't use it directly.
- **Per-run cost.** Recording every PR push to a public repo with
  100s of tests can hit the plan's recorded-test-count quota.
  Consider main-only recording for low-traffic projects.
- **No first-party Jest / Mocha integration.** The platform is
  Playwright + Cypress focused; other runners need custom JUnit XML
  ingestion (which loses per-test artifacts).
- **Doc URL drift.** Per the redirect chain observed in this skill's
  source-fetch (currents.dev → docs.currents.dev → versioned
  paths), Currents docs occasionally move. Pin a version of the
  SDK package and re-verify URLs at each upgrade.

## References

- [currents-docs][currents] — Currents.dev overview, "test suite
  over time, and more" positioning, supported runners
  (Playwright explicit; Cypress per Step 8).
- [currents-pw-quickstart][cqs] — Playwright integration: install,
  `currents.config.ts` shape (`recordKey` + `projectId`),
  reporter registration, artifact config (`trace` / `video` /
  `screenshot`), `npx pwc` run command.
- [`junit-xml-analysis`](../junit-xml-analysis/SKILL.md) — pair
  with Currents to keep CI gating self-hosted (JUnit) while
  Currents handles longitudinal analytics.
- [`testrail-integration`](../testrail-integration/SKILL.md),
  [`xray-integration`](../xray-integration/SKILL.md),
  [`zephyr-integration`](../zephyr-integration/SKILL.md) — sibling
  test-management integrations (different role: test management
  vs analytics).
