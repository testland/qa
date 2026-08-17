# Playwright suite has no CI story

## Problem Description

Our E2E suite runs on developer machines only. `playwright.config.ts` is
whatever `npm init` left behind, and there is no workflow, so nothing runs on a
pull request.

Two things have bitten us on other suites and we want them handled up front.
First, the suite takes about 20 minutes on one machine and we are not willing
to add that to every PR. Second, when a test does fail in CI we currently have
nothing to debug with - no artefacts survive the run.

We also keep merging pull requests where someone left a test focused, so the
suite silently ran a single test and went green.

The runners are `ubuntu-latest`, and we test against Chromium, Firefox and
WebKit.

## Output Specification

Deliver two files:

1. A complete `playwright.config.ts` covering the three browsers, sensible
   parallelism, retry behaviour that differs between local and CI, artefact
   capture that is useful for debugging a failure without bloating storage on
   green runs, and both a human-readable and a machine-readable report.
2. `.github/workflows/e2e.yml` running the suite on pull requests, splitting the
   work across parallel jobs so wall-clock stays low, and preserving whatever a
   failure produces.

Explain nothing in prose - the two files are the deliverable. Assume the app is
served at `http://localhost:3000` and that `npm ci` installs the project.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
});

=============== FILE: tests/smoke.spec.ts ===============
import { test, expect } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
});
