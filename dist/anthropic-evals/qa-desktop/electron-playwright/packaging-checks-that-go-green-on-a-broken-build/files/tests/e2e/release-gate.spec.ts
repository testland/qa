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

  // unsigned at gate time - flips after notarisation (see RELENG-771)
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
