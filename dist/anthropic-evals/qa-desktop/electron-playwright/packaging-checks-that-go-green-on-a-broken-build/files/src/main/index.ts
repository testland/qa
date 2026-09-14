import { app } from 'electron';
import { createMainWindow, openProject } from './window';

app.whenReady().then(() => {
  const window = createMainWindow();

  // A packaged Ledgerline opens a project passed on the command line.
  const positional = process.argv.slice(1).find((a) => !a.startsWith('-'));
  if (positional) openProject(window, positional);
});
