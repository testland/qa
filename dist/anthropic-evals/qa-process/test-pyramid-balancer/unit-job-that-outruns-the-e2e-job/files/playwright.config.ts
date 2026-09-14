import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-nightly',
  testMatch: '**/*.spec.ts',
  workers: 1,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL, trace: 'retain-on-failure' }
});
