# Open Project test sits for thirty seconds and then gives up

## Problem Description

`tests/e2e/open-project.spec.ts` was written last year by an engineer who ran it
headed on his own machine and - we only worked this out in August - clicked
through the file picker himself while it was running. It went into the nightly
desktop job on 2026-08-11 and has not passed once since. It hangs for the full
thirty seconds and then reports `Timeout 30000ms exceeded` against the project
title check.

While we are in there: `/tmp/demo-ledger` does not exist on the nightly runner
and never has. It was a folder on Dan's laptop with three months of his own test
data in it. Whatever project the test opens it is going to have to make for
itself, in a directory the runner will actually let it write to, and that
directory is different on every runner and different on every run. It should
clean up after itself too - the nightly image is reused and we have found
leftovers.

The second half of the same test is a separate problem. It opens Preferences
from the toolbar and then reads the second entry out of the window list. That
came back `undefined` about one run in three, so somebody put a two-second wait
in front of it. It is now undefined about one run in twenty, which I would argue
is worse, because it looks fixed.

Third thing, possibly connected to nothing. Every locator in that file goes
through a `byElectronId()` helper. When we moved the desktop runtime from 29 to
31 in June, every id in the file changed and the entire spec went red in one go
even though none of the markup had changed. The team's conclusion was that we
should pin the runtime at 31 and never move it again. I do not think that is the
right lesson and I cannot articulate why, and I would like you to.

The app source is attached for reference and is not to be changed. The nightly
job builds the exact artefact we ship to customers and I am not shipping a build
that knows it is under test. `tests/e2e/quit.spec.ts` passes and is out of
scope.

## Output Specification

1. Rewrite `tests/e2e/open-project.spec.ts` so it runs start to finish
   unattended, with nobody at the keyboard.
2. The project directory it opens must be created by the test at run time and
   removed afterwards - there is no fixed path for it on the nightly runner.
3. Do not modify anything under `src/`.
4. Keep everything the test currently checks: the project opens, the heading
   shows the project name, the open is recorded where the app records it, and
   Preferences opens in its own window.
5. Write `docs/open-project-notes.md` - one short section per failure above, and
   your answer on the plan to pin the runtime version.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/e2e/open-project.spec.ts ===============
import { test, expect, _electron as electron, type Page } from '@playwright/test';

function byElectronId(window: Page, id: string) {
  return window.locator(`[__electron_id="${id}"]`);
}

test('opening a project loads it and records it', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await byElectronId(window, '31-4-open-project').click();

  // the OS picker is up at this point - type the path and confirm
  await window.keyboard.type('/tmp/demo-ledger');
  await window.keyboard.press('Enter');

  await expect(byElectronId(window, '31-4-project-title')).toHaveText('demo-ledger');

  await byElectronId(window, '31-4-preferences').click();
  await window.waitForTimeout(2000);

  const preferences = app.windows()[1];
  await expect(preferences.getByRole('heading', { name: 'Preferences' })).toBeVisible();

  await app.close();
});

=============== FILE: src/main/ipc.ts ===============
import { app, dialog, ipcMain, BrowserWindow } from 'electron';
import path from 'node:path';

const recentProjects: string[] = [];

ipcMain.handle('project:open', async (event) => {
  const parent = BrowserWindow.fromWebContents(event.sender)!;

  const result = await dialog.showOpenDialog(parent, {
    title: 'Open project',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const projectPath = result.filePaths[0];
  const name = path.basename(projectPath);

  recentProjects.unshift(projectPath);
  app.addRecentDocument(projectPath);
  parent.setTitle(`Ledgerline - ${name}`);

  return { projectPath, name };
});

ipcMain.handle('project:recent', () => recentProjects.slice(0, 10));

=============== FILE: src/renderer/index.html ===============
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Ledgerline</title>
  </head>
  <body>
    <header>
      <h1 id="project-title">No project open</h1>
      <nav aria-label="Main">
        <button type="button" data-action="open-project">Open project</button>
        <button type="button" data-action="preferences">Preferences</button>
        <button type="button" data-action="quit">Quit</button>
      </nav>
    </header>
    <main>
      <label for="account-filter">Filter accounts</label>
      <input id="account-filter" type="search" />
      <table>
        <caption>Ledger entries</caption>
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col">Debit</th>
            <th scope="col">Credit</th>
          </tr>
        </thead>
        <tbody id="entries"></tbody>
      </table>
    </main>
    <script src="./app.js"></script>
  </body>
</html>

=============== FILE: tests/e2e/quit.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

test('quit closes every window', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: 'Quit' }).click();

  await expect.poll(() => app.windows().length, { timeout: 10_000 }).toBe(0);
});

=============== FILE: reports/nightly-open-project.txt ===============
nightly-desktop 2026-09-09, tests/e2e/open-project.spec.ts

  1) opening a project loads it and records it

     Error: Timeout 30000ms exceeded.
     waiting for expect(locator).toHaveText('demo-ledger')
     locator resolved to hidden <h1 id="project-title">No project open</h1>

     at open-project.spec.ts:19

  1 failed, 0 passed (31.4s)

nightly-desktop 2026-09-05, tests/e2e/open-project.spec.ts

  1) opening a project loads it and records it

     TypeError: Cannot read properties of undefined (reading 'getByRole')

     at open-project.spec.ts:25

  1 failed, 0 passed (33.8s)

nightly-desktop 2026-08-11, first run after the spec was added to the job

  1) opening a project loads it and records it

     Error: Timeout 30000ms exceeded.
     waiting for expect(locator).toHaveText('demo-ledger')

  1 failed, 0 passed (31.9s)
