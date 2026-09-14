# Four tests, four launches, and the file still falls over as a unit

## Problem Description

`tests/e2e/workspace.spec.ts` has four tests. Each one starts its own copy of
Ledgerline and closes it at the end - we moved off a shared instance in June
precisely so the tests would stop leaning on each other.

It has not helped as much as we hoped.

When all four pass, fine. The moment any one of them fails for a real reason,
every test after it in the file fails too, and not with the failure that started
it: they fail at launch, complaining the profile is in use. Reorder the file and
the wreckage moves with it. Run the failing test on its own and you get the one
honest failure and nothing else. Marek's terminal from Tuesday is attached,
including what `ps` says once the run has finished.

There is a second thing in the same file and I am not sure it is the same
problem. `recent workspaces lists one entry for this run` is green on CI and red
on every laptop that has run the suite before - Marek's says thirty-four. Wiping
one folder out of his home directory makes it green again for exactly one run.

And a third, which is the one that actually worries me. Last Thursday, on a
branch, we took the single-instance lock out of `src/main/index.ts` altogether -
commented out the call, shipped nothing, just wanted to watch the test fail. It
passed. A test that goes green whether or not the behaviour it names exists is
not a test.

What I care about is that nothing one test writes can be seen by another test,
and that a failure stays inside the test that caused it.

Four people have opinions and I want a straight yes or no on each:

- Nadia wants two retries on the file. The follow-on failures are obviously
  environmental rather than real, so retrying should wash them out.
- Bo wants a step at the top of the test job that kills any Ledgerline process
  left over from a previous run, before the suite starts.
- Hana wants a step after the run that counts Ledgerline processes and fails the
  job if any are still alive, so that the next time we leak one we hear about it
  from CI rather than from Marek.
- Jonas wants to go back to one launch in `beforeAll`. Four launches for four
  tests is three extra chances to collide, and we never actually needed four.

We already run one test at a time - the config is attached - so this is not
concurrency inside the run. `src/main/index.ts` is attached for context and is
not to be changed; the lock is what we ship and the tests have to cope with it.
`tests/e2e/about.spec.ts` passes and is out of scope.

## Output Specification

1. Rewrite `tests/e2e/workspace.spec.ts` so a failure in any one test leaves the
   others unaffected, and so every test passes run alone, in any order, and on a
   machine that has run the suite a hundred times before.
2. You may add `tests/e2e/fixtures/app.ts` if shared setup helps.
3. Keep all four tests and what each one checks. The single-instance test must
   still exercise a second copy of the application starting while the first one
   is running, and it must be able to fail when that behaviour is removed.
4. Update `.github/workflows/desktop-e2e.yml` where your answer requires it.
5. Do not change `src/main/index.ts` or `tests/e2e/about.spec.ts`.
6. Write `docs/workspace-isolation.md`: what you found, and a yes or no to each
   of the four proposals with the reason.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/e2e/workspace.spec.ts ===============
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
} from '@playwright/test';

async function launch(): Promise<ElectronApplication> {
  return electron.launch({ args: ['.'] });
}

test('workspace create', async () => {
  const app = await launch();
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'New workspace' }).click();
  await window.getByLabel('Workspace name').fill('Quarterly');
  await window.getByRole('button', { name: 'Create' }).click();

  await expect(window.getByRole('heading', { name: 'Quarterly' })).toBeVisible();

  await app.close();
});

test('workspace rename persists', async () => {
  const app = await launch();
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'New workspace' }).click();
  await window.getByLabel('Workspace name').fill('Payroll');
  await window.getByRole('button', { name: 'Create' }).click();

  await window.getByRole('button', { name: 'Rename workspace' }).click();
  await window.getByLabel('Workspace name').fill('Payroll 2026');
  await window.getByRole('button', { name: 'Save' }).click();

  await expect(window.getByRole('heading', { name: 'Payroll 2026' })).toBeVisible();

  await app.close();
});

test('recent workspaces lists one entry for this run', async () => {
  const app = await launch();
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'New workspace' }).click();
  await window.getByLabel('Workspace name').fill('Audit');
  await window.getByRole('button', { name: 'Create' }).click();

  const recents: string[] = await app.evaluate(({ app: electronApp }) =>
    electronApp.getRecentDocuments()
  );
  expect(recents).toHaveLength(1);

  await app.close();
});

test('a second instance focuses the window already open', async () => {
  const app = await launch();
  await app.firstWindow();

  const second = await launch();
  expect(app.windows().length).toBe(1);

  await second.close();
  await app.close();
});

=============== FILE: src/main/index.ts ===============
import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [existing] = BrowserWindow.getAllWindows();
    if (!existing) return;
    if (existing.isMinimized()) existing.restore();
    existing.focus();
  });

  app.whenReady().then(() => {
    // workspace state, recent documents and window bounds all live under userData
    createMainWindow();
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

=============== FILE: tests/e2e/about.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

test('about box reports the shipped version', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'About' }).click();

  await expect(window.getByText(/version 4\.7\.\d+/)).toBeVisible();

  await app.close();
});

=============== FILE: .github/workflows/desktop-e2e.yml ===============
name: desktop-e2e

on: [pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run build:desktop
      - run: npx playwright test --config=playwright.electron.config.ts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: desktop-report
          path: playwright-report/

=============== FILE: reports/isolation-evidence.txt ===============
$ npx playwright test tests/e2e/workspace.spec.ts
Running 4 tests using 1 worker

  ok 1 workspace create

  2) workspace rename persists

     Error: expect(locator).toBeVisible()
     Expected: visible
     Received: hidden
     waiting for getByRole('heading', { name: 'Payroll 2026' })
     (the rename dialog reported "name already in use")

  3) recent workspaces lists one entry for this run

     Error: electron.launch: Process failed to launch!
     [ERROR:SingletonLock] File exists
     (/Users/marek/Library/Application Support/Ledgerline/SingletonLock)

  4) a second instance focuses the window already open

     Error: electron.launch: Process failed to launch!
     [ERROR:SingletonLock] File exists
     (/Users/marek/Library/Application Support/Ledgerline/SingletonLock)

  3 failed, 1 passed (2m 41s)

$ ps -ax | grep -c '[L]edgerline'
3

$ npx playwright test tests/e2e/workspace.spec.ts --grep "workspace rename"
  1 failed, 0 passed (24.1s)

$ npx playwright test tests/e2e/workspace.spec.ts --grep "recent workspaces"

  1) recent workspaces lists one entry for this run

     Error: expect(received).toHaveLength(expected)
     Expected length: 1
     Received length: 34

$ rm -rf ~/Library/Application\ Support/Ledgerline
$ npx playwright test tests/e2e/workspace.spec.ts --grep "recent workspaces"
  1 passed (9.4s)

$ npx playwright test tests/e2e/workspace.spec.ts --grep "recent workspaces"
  1 failed, 0 passed (9.8s)
     Received length: 2

--- branch spike/drop-single-instance-lock, 2026-09-10 ---

src/main/index.ts: requestSingleInstanceLock() call and the second-instance
handler both commented out; two copies of the app now run happily side by side.

$ npx playwright test tests/e2e/workspace.spec.ts --grep "second instance"
  1 passed (11.8s)
