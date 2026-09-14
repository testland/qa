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
