# Linux has never launched, and nobody will wait 34 minutes on a pull request

## Problem Description

Ledgerline is the desktop accounting client we ship for macOS, Windows and
Linux. Its end-to-end suite is 42 tests and it used to run only on Priya's
MacBook. Three weeks ago Dario moved it into CI across the three GitHub-hosted
runner images. macOS and Windows have been green ever since. The Linux leg has
never passed.

Every Linux run dies the same way, before any window exists:

    [FATAL:electron_main_delegate.cc(288)] Failed to initialize display.

We added a debug step that prints `DISPLAY` and queries the display server, and
both of those are in the attached job log, so something is answering on `:99`.

Ravi wants to put `--no-sandbox --disable-gpu --disable-dev-shm-usage` on the
launch. He used exactly that at his last job, it is what the first four search
results say about this message, and I am inclined to just let him have it - if
that is the answer, apply it. I am asking first only because the last time we
pasted flags in to make a CI error go away we carried them around for two years
and never found out what they were for.

Second problem, unrelated to the first. Nobody is going to put a 34-minute check
in front of a pull request. I want all three images reporting inside ten
minutes, and I mean ten minutes of wall clock from the moment a job starts to
the moment it reports - not ten minutes of test execution. Run 63 in the
attached log is broken out step by step for all three images, which is as much
as I know about where the time goes.

Karol's plan is to stop pinning the run to one worker and let each runner use
its cores - the macOS image has six - and he thinks that alone gets us most of
the way there.

The spec files are correct, they pass on the two working legs, and they are not
to be changed. Two of them are attached for context.

## Output Specification

1. An updated `tests/e2e/helpers/app.ts`.
2. An updated `playwright.electron.config.ts`.
3. An updated `.github/workflows/desktop-e2e.yml`, still triggered by pull
   requests and still covering `ubuntu-latest`, `macos-latest` and
   `windows-latest`.
4. `docs/desktop-ci-notes.md` - what was stopping the Linux leg, what you
   changed, a direct answer to Ravi and to Karol, and how a pull-request run now
   comes in under ten minutes.

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
          xdpyinfo -display :99 | head -4

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
desktop-e2e run 63, 2026-09-11, pull request #1184

--- ubuntu-latest --------------------------------------------------
  Set up job                                            0m05s
  Run actions/checkout@v5                               0m17s
  Run actions/setup-node@v4                             0m11s
  Run npm ci                                            1m22s
  Run npm run build:desktop                             2m21s
  Run Start a virtual display                           0m18s
  Run Show display state                                0m01s
      DISPLAY=:99
      name of display:    :99
      version number:     11.0
      vendor string:      The X.Org Foundation
  Run Run desktop suite (Linux)                         0m19s
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
  Run actions/upload-artifact@v4                        0m14s
  Job total                                             4m53s

--- macos-latest ---------------------------------------------------
  Set up job                                            0m05s
  Run actions/checkout@v5                               0m19s
  Run actions/setup-node@v4                             0m12s
  Run npm ci                                            1m47s
  Run npm run build:desktop                             2m58s
  Run Run desktop suite (macOS / Windows)              34m08s
      Running 42 tests using 1 worker
      42 passed (34m 08s)
  Run actions/upload-artifact@v4                        0m22s
  Job total                                            39m51s

--- windows-latest -------------------------------------------------
  Set up job                                            0m07s
  Run actions/checkout@v5                               0m36s
  Run actions/setup-node@v4                             0m21s
  Run npm ci                                            2m31s
  Run npm run build:desktop                             3m44s
  Run Run desktop suite (macOS / Windows)              31m52s
      Running 42 tests using 1 worker
      42 passed (31m 52s)
  Run actions/upload-artifact@v4                        0m29s
  Job total                                            39m40s

--- 2026-09-12, Priya's machine, macOS 15.6 ------------------------

  $ npx playwright test --config=playwright.electron.config.ts tests/e2e/launch.spec.ts
    Running 1 test using 1 worker
    [app stdout] Ledgerline 4.7.2 starting
    [app stdout] no preferences file found, writing defaults
    1 passed (46.3s)

  $ ls -l "$HOME/Library/Application Support/Ledgerline/preferences.json"
    -rw-r--r--  1 priya  staff  2184 12 Sep 09:41 preferences.json

  $ open -a Ledgerline
    Ledgerline 4.7.2 starting
    preferences loaded: 9 keys, 5 recent workspaces
