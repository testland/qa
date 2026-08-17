import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://example-books.com',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    retries: { runMode: 2, openMode: 0 },
  },
});
