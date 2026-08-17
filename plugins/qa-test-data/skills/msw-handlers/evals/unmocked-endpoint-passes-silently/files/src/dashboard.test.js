import { expect, test } from 'vitest';
import { loadDashboard } from './dashboard.js';

test('returns the profile name', async () => {
  const view = await loadDashboard('u-1');
  expect(view.name).toBe('Ada Lovelace');
});

test('reports the unread count', async () => {
  const view = await loadDashboard('u-1');
  expect(view.unread).toBe(0);
});
