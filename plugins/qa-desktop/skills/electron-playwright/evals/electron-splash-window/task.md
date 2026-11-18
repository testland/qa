# Make the Electron app test reliable

## Problem Description

Make `tests/app.spec.ts` reliable (`notes.md`, `main.js`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: main.js ===============
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const splash = new BrowserWindow({ width: 400, height: 300, frame: false });
  splash.loadFile('splash.html');

  setTimeout(() => {
    const main = new BrowserWindow({
      width: 1200, height: 800, show: true,
      webPreferences: { preload: path.join(__dirname, 'preload.js') },
    });
    main.loadFile('index.html');
    main.maximize();
    splash.close();
  }, 1500);
});

ipcMain.handle('get-version', () => app.getVersion());

=============== FILE: preload.js ===============
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', { getVersion: () => ipcRenderer.invoke('get-version') });

=============== FILE: tests/app.spec.ts ===============
import { test, expect, _electron as electron } from '@playwright/test';

test('shows the app version in the footer', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = app.windows()[0];
  await expect(window.locator('#version')).toHaveText(/\d+\.\d+\.\d+/);

  const win = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]);
  expect(win.isMaximized()).toBe(true);
});

=============== FILE: notes.md ===============
- The test fails at random: sometimes "Target page, context or browser has been closed",
  sometimes `#version` is never found.
- The isMaximized check throws.
- After a failure in CI the Electron app keeps running and the next job times out.
