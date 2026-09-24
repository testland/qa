import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  retries: 2,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
  },
});
