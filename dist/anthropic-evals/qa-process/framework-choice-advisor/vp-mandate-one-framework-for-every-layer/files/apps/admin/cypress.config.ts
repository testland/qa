import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'acme-admin',
  video: true,
  retries: { runMode: 4, openMode: 2 },
  defaultCommandTimeout: 20000,
  e2e: {
    baseUrl: 'https://admin.staging.acme.internal',
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
});
