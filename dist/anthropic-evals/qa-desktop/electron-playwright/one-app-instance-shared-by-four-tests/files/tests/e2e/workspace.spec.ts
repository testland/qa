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
