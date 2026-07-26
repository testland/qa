---
name: currents-integration
description: "Wires Currents.dev cross-run test analytics into a Playwright suite: installs `@currents/playwright`, authors `currents.config.ts` (env-sourced `recordKey` + `projectId`), registers `currentsReporter()`, enables trace/video/screenshot artifacts, and runs via `npx pwc` so per-test traces stream to the Currents dashboard. Use when a Playwright suite needs test-suite-health trends across runs - flakiness rate over time, slowest-test history, pass-rate regression - that a single-run reporter cannot show; for a one-off local report, Playwright's built-in HTML reporter is enough."
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
integration follows the same shape with `@currents/cypress` (see
[references/ci-and-cypress-integration.md](references/ci-and-cypress-integration.md)).

## When to use

- A Playwright suite has 100+ tests and the team needs over-time
  analytics: which tests flake, which tests slow down across PRs,
  which tests fail on certain CI runners only.
- The team wants per-PR test diffs (this PR's failures vs main's
  failures) without building a custom dashboard.
- The team is on Cypress (use `@currents/cypress` with the same
  shape).

If the suite is small (<50 tests) and the team only needs the
per-run report, Playwright's built-in HTML reporter is enough - no
SaaS dependency.

## How to use

1. Confirm the suite is large enough to need over-time analytics (see
   When to use); a small suite is fine on Playwright's HTML reporter.
2. Install `@currents/playwright`.
3. Author `currents.config.ts` (`recordKey` from env, `projectId`
   inline) and register `currentsReporter()` in `playwright.config.ts`.
4. Enable `trace` / `video` / `screenshot` artifacts so Currents has
   per-test data to analyze.
5. Run `npx pwc`; open the dashboard URL it prints.
6. Wire the same run into CI, recording both main (baseline) and PR
   runs - the full workflow, per-PR-vs-main rationale, and the Cypress
   sister integration are in
   [references/ci-and-cypress-integration.md](references/ci-and-cypress-integration.md).

## Install

Per [currents-pw-quickstart][cqs]:

[cqs]: https://docs.currents.dev/getting-started/your-first-playwright-run.md

```bash
npm i -D @currents/playwright
# Equivalent for pnpm / yarn / bun.
```

## Configure `currents.config.ts`

Place next to `playwright.config.ts`. Per [currents-pw-quickstart][cqs]:

```typescript
import { CurrentsConfig } from "@currents/playwright";

const config: CurrentsConfig = {
  recordKey: process.env.CURRENTS_RECORD_KEY!,
  projectId: "your project id goes here",
};

export default config;
```

The `recordKey` is the project's record-write secret - **never check
it into the repo**. The `projectId` is non-secret (visible in the
Currents dashboard URL); it's safe to inline.

## Register the reporter

In `playwright.config.ts`, per [currents-pw-quickstart][cqs]:

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

## Enable artifacts

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

## Run

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

## Worked example

A 120-test Playwright suite, first Currents run:

1. `npm i -D @currents/playwright`.
2. `currents.config.ts` alongside `playwright.config.ts`:

```typescript
import { CurrentsConfig } from "@currents/playwright";

const config: CurrentsConfig = {
  recordKey: process.env.CURRENTS_RECORD_KEY!,
  projectId: "abc123def",
};

export default config;
```

3. In `playwright.config.ts`, add the reporter and turn artifacts on:

```typescript
reporter: [currentsReporter()],
use: { trace: "on", video: "on", screenshot: "on" },
```

4. Export the secret and run:

```bash
export CURRENTS_RECORD_KEY=...     # from the Currents dashboard
npx pwc
```

`pwc` streams each test event to Currents and prints a dashboard URL
on completion. After the second run on `main`, the dashboard's trend
graphs start showing flake rate and slowest-test movement across runs.

## Operating in CI

Run `npx pwc` from the CI job with `CURRENTS_RECORD_KEY` supplied as a
secret, and trigger on both `push` to `main` and `pull_request` so the
dashboard has a baseline (main) to compare each PR run against. Keep
Playwright's HTML report as an `if: always()` artifact fallback for
when the dashboard is unreachable. The full GitHub Actions workflow,
the per-PR-vs-main baseline rationale, and the Cypress sister
integration are in
[references/ci-and-cypress-integration.md](references/ci-and-cypress-integration.md).

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                              | Fix |
|--------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hardcoding `recordKey` in `currents.config.ts`                     | Secret leaks into git; bad actors can pollute the dashboard.              | Read from env (see Configure `currents.config.ts`). |
| Running both Playwright's default HTML reporter and `currentsReporter` without artifact handling | Doubled artifact size; CI runner disk pressure. | Keep both reporters; rely on the `if: always()` upload (see Operating in CI). |
| Sending production / staging real-user CI runs to Currents          | Mixes test signal with monitoring signal; analytics pollute.              | Send only test runs; production observability lives elsewhere. |
| Disabling `trace: "on"` to "save space"                              | Currents's value is per-test trace inspection; disabled traces gut the analytics. | Use `retain-on-failure` as a middle ground (see Enable artifacts). |
| Recording PR runs without recording main runs                        | No baseline; per-PR diff is meaningless.                                   | Record main on every push too (see Operating in CI). |
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

- [currents-docs][currents] - Currents.dev overview, "test suite
  over time, and more" positioning, supported runners
  (Playwright explicit; Cypress in the references file).
- [currents-pw-quickstart][cqs] - Playwright integration: install,
  `currents.config.ts` shape (`recordKey` + `projectId`),
  reporter registration, artifact config (`trace` / `video` /
  `screenshot`), `npx pwc` run command.
- [references/ci-and-cypress-integration.md](references/ci-and-cypress-integration.md) -
  full GitHub Actions workflow, per-PR-vs-main baselines, and the
  Cypress sister integration.
- `junit-xml-analysis` - pair
  with Currents to keep CI gating self-hosted (JUnit) while
  Currents handles longitudinal analytics.
- `testrail-integration`,
  `xray-integration`,
  `zephyr-integration` - sibling
  test-management integrations (different role: test management
  vs analytics).
