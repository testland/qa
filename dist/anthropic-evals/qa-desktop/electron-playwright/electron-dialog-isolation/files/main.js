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
