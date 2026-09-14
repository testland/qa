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
