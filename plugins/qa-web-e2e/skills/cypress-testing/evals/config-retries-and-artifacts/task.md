# Cypress runs green locally, opaque in CI

## Problem Description

Our `cypress.config.ts` is the file the installer generated and nothing has
been added to it. Two consequences keep costing us time.

When a spec fails in CI we get a stack trace and nothing else - no way to see
what the page looked like at the point of failure, so the first move is always
"run it locally and hope it reproduces".

And developers keep hitting retries locally that they did not ask for, which
masks a genuinely broken test during development; we want retries to help the
CI signal without hiding breakage while someone is writing the test.

Specs live in `cypress/e2e` and are named `*.cy.ts`. The app runs at
`http://localhost:3000`. We do not pay for Cypress Cloud.

## Output Specification

1. A complete `cypress.config.ts` configuring the spec location, the base URL,
   retry behaviour that differs between the interactive and headless runs, and
   the artefact capture needed to debug a CI failure after the fact.
2. `.github/workflows/e2e.yml` that starts the app, waits for it to be
   reachable before running any spec, runs the suite headless, and keeps
   whatever the run produced when it fails.

Files are the deliverable; do not explain them in prose.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress.config.ts ===============
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return config;
    },
  },
});

=============== FILE: cypress/e2e/smoke.cy.ts ===============
describe('Smoke', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.findByRole('heading', { name: /welcome/i }).should('be.visible');
  });
});

=============== FILE: package.json ===============
{
  "name": "storefront-e2e",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "devDependencies": {
    "@testing-library/cypress": "^10.0.2",
    "cypress": "^13.15.0"
  }
}
