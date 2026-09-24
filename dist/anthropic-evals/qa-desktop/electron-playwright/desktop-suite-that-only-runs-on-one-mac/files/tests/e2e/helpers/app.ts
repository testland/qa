import path from 'node:path';
import { _electron as electron, type ElectronApplication } from '@playwright/test';

const ARTEFACTS: Record<string, string> = {
  darwin: 'dist/mac-arm64/Ledgerline.app/Contents/MacOS/Ledgerline',
  win32: 'dist/win-unpacked/Ledgerline.exe',
  linux: 'dist/linux-unpacked/ledgerline',
};

export function artefactPath(): string {
  const relative = ARTEFACTS[process.platform];
  if (!relative) throw new Error(`no desktop artefact mapped for ${process.platform}`);
  return path.resolve(relative);
}

export async function launchApp(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: artefactPath(),
    args: [],
    env: {
      NODE_ENV: 'test',
      LEDGERLINE_TELEMETRY: '0',
      LEDGERLINE_FIXTURES: path.resolve('tests/e2e/fixtures'),
    },
  });
}
