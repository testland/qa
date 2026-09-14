# Two CI legs green, the Linux one dead at launch, and a gate nobody will wait for

## Problem Description

Our desktop end-to-end suite used to run only on Priya's MacBook. Three weeks
ago Dario moved it into CI across the three GitHub-hosted runner images and did
the homework: the binary is resolved from the running platform instead of his
own home directory, the run is pinned to one worker, the Linux leg starts a
virtual display before the tests and runs them under the usual wrapper, and the
report is uploaded per image whatever the outcome. macOS and Windows have been
green since. Linux has not passed once.

Every Linux run dies the same way, before any window exists, with
`Failed to initialize display`. That is the thing the virtual display was
supposed to fix and it is definitely running - we added a debug step that prints
`DISPLAY` and queries the server, and both are in the attached log. The display
is up, the variable is set in the job, and the application still comes up
blind.

Ravi has lost patience and wants to add `--no-sandbox --disable-gpu
--disable-dev-shm-usage` to the launch, or failing that drop the Linux leg
entirely and say we only support macOS and Windows in CI. I do not want to do
either without understanding why the display is not reaching the process,
because I do not believe the runner is the thing that is broken.

One detail that may be nothing. On the two green legs the application starts
with no saved preferences at all, every single run - no window size, no recent
workspaces, factory state. We assumed that was CI being clean. Priya points out
her Mac does not behave that way and never has.

Second problem, unrelated to the first. The suite takes 34 minutes on macOS and
32 on Windows. Nobody will put that in front of a pull request. We want a PR
gate that finishes inside ten minutes and still covers all three images. Karol's
plan is to let the runner use its cores - the macOS image has six - instead of
the single worker Dario pinned, and he thinks that alone gets us most of the way
there.

The four spec files are not to be changed; they are correct and they pass on the
two working legs.

## Output Specification

1. An updated `tests/e2e/helpers/app.ts`.
2. An updated `playwright.electron.config.ts`.
3. An updated `.github/workflows/desktop-e2e.yml` still covering
   `ubuntu-latest`, `macos-latest` and `windows-latest` on pull requests.
4. `docs/desktop-ci-notes.md` - what was actually stopping the Linux leg and
   what you changed, a direct answer to Ravi's proposal and to Karol's, and the
   arithmetic that gets a pull-request run under ten minutes.

Do not change the spec files.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/e2e/helpers/app.ts ===============
import path from 'node:path';
import { _electron as electron, type ElectronApplication } from '@playwright/test';

const ARTEFACTS: Record<string, string> = {
  darwin: 'dist/mac-arm64/Ledgerline.app/Contents/MacOS/Ledgerline',
  win32: 'dist/win-unpacked/Ledgerline.exe',
  linux: 'dist/linux-unpacked/ledgerline',
};

export function artefactPath(): string {
  const relative = ARTEFACTS[process.platform];
  if (!relative) throw new Error(`no desktop artefact mapped for ${process.platform}`);
  return path.resolve(relative);
}

export async function launchApp(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: artefactPath(),
    args: [],
    env: {
      NODE_ENV: 'test',
      LEDGERLINE_TELEMETRY: '0',
      LEDGERLINE_FIXTURES: path.resolve('tests/e2e/fixtures'),
    },
  });
}

=============== FILE: playwright.electron.config.ts ===============
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['junit', { outputFile: 'reports/desktop-junit.xml' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});

=============== FILE: .github/workflows/desktop-e2e.yml ===============
name: desktop-e2e

on: [pull_request]

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build:desktop

      - name: Start a virtual display
        if: runner.os == 'Linux'
        run: |
          sudo apt-get install -y xvfb
          Xvfb :99 -screen 0 1280x1024x24 &

      - name: Show display state
        if: runner.os == 'Linux'
        env:
          DISPLAY: ':99'
        run: |
          echo "DISPLAY=$DISPLAY"
          xdpyinfo -display :99 | head -2

      - name: Run desktop suite (Linux)
        if: runner.os == 'Linux'
        env:
          DISPLAY: ':99'
        run: xvfb-run --auto-servernum npx playwright test --config=playwright.electron.config.ts

      - name: Run desktop suite (macOS / Windows)
        if: runner.os != 'Linux'
        run: npx playwright test --config=playwright.electron.config.ts

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: desktop-report-${{ matrix.os }}
          path: playwright-report/

=============== FILE: tests/e2e/launch.spec.ts ===============
import { test, expect } from '@playwright/test';
import { launchApp } from './helpers/app';

test('app window opens', async () => {
  const app = await launchApp();
  const window = await app.firstWindow();

  await expect(window.getByRole('heading', { name: 'Ledgerline' })).toBeVisible();

  await app.close();
});

=============== FILE: tests/e2e/workspace.spec.ts ===============
import { test, expect } from '@playwright/test';
import { launchApp } from './helpers/app';

test('recent list keeps five entries', async () => {
  const app = await launchApp();
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Recent' }).click();
  await expect(window.getByRole('listitem')).toHaveCount(5);

  await app.close();
});

=============== FILE: reports/ci-log-excerpt.txt ===============
--- ubuntu-latest, desktop-e2e run 63, 2026-09-11 ---

  Run Start a virtual display
    Xvfb :99 -screen 0 1280x1024x24 &

  Run Show display state
    DISPLAY=:99
    name of display:    :99
    version number:     11.0

  Run Run desktop suite (Linux)
    Running 42 tests using 1 worker

      1) [desktop] > launch.spec.ts:5:1 > app window opens

        Error: electron.launch: Process failed to launch!
        [3311:0911/094402.118460:FATAL:electron_main_delegate.cc(288)] Failed to initialize display.
        Trace/breakpoint trap (core dumped)

      2) [desktop] > workspace.spec.ts:5:1 > recent list keeps five entries

        Error: electron.launch: Process failed to launch!
        [3402:0911/094404.221781:FATAL:electron_main_delegate.cc(288)] Failed to initialize display.
        Trace/breakpoint trap (core dumped)

    42 failed, 0 passed (18.7s)

--- macos-latest, desktop-e2e run 63, 2026-09-11 ---
  Running 42 tests using 1 worker
    42 passed (34m 08s)

--- windows-latest, desktop-e2e run 63, 2026-09-11 ---
  Running 42 tests using 1 worker
    42 passed (31m 52s)

--- macos-latest, desktop-e2e run 63, first lines of the app's own stdout ---
  Ledgerline 4.7.2 starting
  userData: /Ledgerline
  no preferences file found, writing defaults
