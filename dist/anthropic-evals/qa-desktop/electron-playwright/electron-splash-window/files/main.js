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
