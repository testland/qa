# Release gate passed on a night the packaging step never ran

## Problem Description

Ledgerline is an accounting client we ship as a desktop app.
`tests/e2e/release-gate.spec.ts` is the last thing that runs before a build is
promoted to the update channel. It exists to prove three things about the
installable artefact: that it reports the version we think we are shipping, that
it is a packaged build and not a development harness, and that it opens exactly
one window.

On 2026-09-04 the notarisation step timed out and the packaging job never
produced a new `dist/`. The release job carried on, the gate went green, and we
promoted the 2026-08-28 binary as 4.7.2. Everyone who has updated since is
running 4.7.1 and their About box says so.

I spent Wednesday trying to get that gate to notice something. I deleted `dist/`
on the runner before the gate step: green. I put the August build back and left
it there: green. I renamed the folder: green. Whatever those three checks are
looking at, it is not the folder we sign and ship, and I would like to know what
it is before I trust a release again. The job log for all three attempts is
attached.

Two proposals in the thread, neither of which I want to adopt without a second
opinion.

Marisol thinks the gate is racing the packaging step and wants a sixty-second
sleep plus two retries in front of the first launch.

Tom wants the gate to notice that `dist/` is missing and take itself out of the
run, on the grounds that a release job should not go red for something that is
not the product's fault.

The release job runs the gate on all three runner images because we sign and
ship three artefacts. `npm run package` writes them to
`dist/mac-arm64/Ledgerline.app/Contents/MacOS/Ledgerline`,
`dist/win-unpacked/Ledgerline.exe` and `dist/linux-unpacked/ledgerline`.

`tests/e2e/window.spec.ts` is the renderer suite. It went red in August when we
broke the ledger table header, exactly as it should have, and it is not part of
this.

## Output Specification

1. Rewrite `tests/e2e/release-gate.spec.ts` and `tests/e2e/helpers/artefact.ts`
   so the gate goes red on both of the builds described above - the stale
   `dist/` from August, and no `dist/` at all - and so each of the three checks
   goes red when the thing it names is wrong.
2. Keep the three checks and what each one names. Do not add a fourth.
3. Update `.github/workflows/release.yml` where your answer requires it.
4. Do not modify `tests/e2e/window.spec.ts` or anything under `src/`.
5. Write `docs/release-gate-review.md`: what each of the three checks was
   actually measuring during those green runs, and a direct answer to Marisol's
   proposal and to Tom's.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/e2e/helpers/artefact.ts ===============
import { _electron as electron, type ElectronApplication } from '@playwright/test';

// LEDGERLINE_ARTEFACT is exported by the release job before the gate step.
export const ARTEFACT = process.env.LEDGERLINE_ARTEFACT;

export async function launchArtefact(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: ARTEFACT,
    args: ['.'],
    env: { ...process.env, LEDGERLINE_CHANNEL: 'release' },
  });
}

=============== FILE: tests/e2e/release-gate.spec.ts ===============
import { test, expect } from '@playwright/test';
import { launchArtefact } from './helpers/artefact';

const RELEASE_VERSION = '4.7.2';

test('artefact reports the release version', async () => {
  const app = await launchArtefact();

  const version = await app.evaluate(({ app }) => app.getVersion());
  expect(version).toBe(RELEASE_VERSION);

  await app.close();
});

test('artefact is a packaged build', async () => {
  const app = await launchArtefact();

  const isPackaged = await app.evaluate(({ app }) => app.isPackaged);
  expect(isPackaged).toBe(false);

  await app.close();
});

test('artefact opens exactly one window', async () => {
  const app = await launchArtefact();
  await app.firstWindow();

  const count = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  expect(count).toBe(1);

  await app.close();
});

=============== FILE: tests/e2e/window.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

test('ledger table renders its column headers', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window.getByRole('columnheader', { name: 'Account' })).toBeVisible();
  await expect(window.getByRole('columnheader', { name: 'Debit' })).toBeVisible();
  await expect(window.getByRole('columnheader', { name: 'Credit' })).toBeVisible();

  await app.close();
});

=============== FILE: src/main/index.ts ===============
import { app } from 'electron';
import { createMainWindow, openProject } from './window';

app.whenReady().then(() => {
  const window = createMainWindow();

  // A packaged Ledgerline opens a project passed on the command line.
  const positional = process.argv.slice(1).find((a) => !a.startsWith('-'));
  if (positional) openProject(window, positional);
});

=============== FILE: package.json ===============
{
  "name": "ledgerline-desktop",
  "version": "4.7.2",
  "private": true,
  "scripts": {
    "package": "electron-builder --publish never",
    "test:gate": "playwright test tests/e2e/release-gate.spec.ts --config=playwright.electron.config.ts"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "electron": "^31.3.1",
    "electron-builder": "^24.13.3"
  }
}

=============== FILE: .github/workflows/release.yml ===============
name: release

on:
  workflow_dispatch:

jobs:
  gate:
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run package
        continue-on-error: true
      - run: npm run test:gate
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: release-gate-${{ matrix.os }}
          path: playwright-report/

=============== FILE: reports/release-job-log.txt ===============
release #318, 2026-09-04, macos-latest

  Run npm run package
    > electron-builder --publish never
    * notarising dist/mac-arm64/Ledgerline.app
    Error: notarisation request timed out after 1800s
    Error: Process completed with exit code 1.
    (step is continue-on-error, job continues)

  Run npm run test:gate
    Running 3 tests using 1 worker
      ok 1 artefact reports the release version
      ok 2 artefact is a packaged build
      ok 3 artefact opens exactly one window
    3 passed (12.1s)

release #319, 2026-09-10, macos-latest - dist/ deleted by hand before the gate step

  Run ls -la dist/
    ls: dist/: No such file or directory
    Error: Process completed with exit code 1.
    (step is continue-on-error, job continues)

  Run npm run test:gate
    3 passed (11.4s)

release #320, 2026-09-11, macos-latest - dist/ restored from the 2026-08-28 build

  Run /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" dist/mac-arm64/Ledgerline.app/Contents/Info.plist
    4.7.1

  Run npm run test:gate
    Running 3 tests using 1 worker
      ok 1 artefact reports the release version
      ok 2 artefact is a packaged build
      ok 3 artefact opens exactly one window
    3 passed (12.6s)
