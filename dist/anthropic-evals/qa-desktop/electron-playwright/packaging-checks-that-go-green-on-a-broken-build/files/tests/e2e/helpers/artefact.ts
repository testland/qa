import { _electron as electron, type ElectronApplication } from '@playwright/test';

// LEDGERLINE_ARTEFACT is exported by the release job before the gate step.
export const ARTEFACT = process.env.LEDGERLINE_ARTEFACT;

export async function launchArtefact(): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: ARTEFACT,
    args: ['.'],
    env: { ...process.env, LEDGERLINE_CHANNEL: 'release' },
  });
}
