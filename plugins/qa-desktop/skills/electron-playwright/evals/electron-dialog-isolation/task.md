# The Electron import test hangs, and fails when it doesn't

## Problem Description

Our Electron import test (`tests/import.spec.ts`) hangs, and when it doesn't hang it fails. Make it reliable without changing how the app behaves for users.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: main.js ===============
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

app.whenReady().then(async () => {
  const splash = new BrowserWindow({ width: 400, height: 300, frame: false });
  await splash.loadFile('splash.html');
  const win = new BrowserWindow({
    width: 1200, height: 800, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  await win.loadFile('index.html');
  splash.close();
  win.show();
});

ipcMain.handle('import-csv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ filters: [{ name: 'CSV', extensions: ['csv'] }] });
  if (canceled) return null;
  const text = await fs.readFile(filePaths[0], 'utf8');
  await fs.writeFile(path.join(app.getPath('userData'), 'last-import.csv'), text);
  return text.split('\n').length - 1;
});

=============== FILE: preload.js ===============
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { importCsv: () => ipcRenderer.invoke('import-csv') });

=============== FILE: tests/import.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

test('imports a CSV', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  await window.click('text=Import CSV');            // a native file dialog opens and the test hangs here
  const saved = await window.evaluate(() => require('fs').readFileSync('/tmp/last-import.csv', 'utf8'));
  expect(saved).toContain('id,name');
});

=============== FILE: tests/fixtures/customers.csv ===============
id,name
1,Ana
2,Ben
