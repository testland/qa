# The Mute button and save toasts confuse screen reader users

## Problem Description

Screen reader users say our Mute button sounds confusing ("Unmute, toggle button, pressed"), and our "Saved to playlist" toasts are sometimes not read at all and sometimes cut off what they were listening to. Fix `src/player.js` (and the HTML if needed) and update `tests/player.spec.ts`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/player.js ===============
const muteBtn = document.querySelector('#mute');
let muted = false;
muteBtn.addEventListener('click', () => {
  muted = !muted;
  player.muted = muted;
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  muteBtn.setAttribute('aria-pressed', String(muted));
});

export function toast(message) {
  const el = document.createElement('div');
  el.setAttribute('role', 'alert');
  el.textContent = message;          // e.g. "Saved to playlist"
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

=============== FILE: src/index.html ===============
<button id="mute" aria-pressed="false">Mute</button>
<button id="save">Save to playlist</button>
<script type="module" src="player.js"></script>

=============== FILE: tests/player.spec.ts ===============
import { test, expect } from '@playwright/test';

test('mute toggles', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mute' }).click();
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
});

test('save shows a toast', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Save to playlist' }).click();
  await expect(page.getByText('Saved to playlist')).toBeVisible();
});
