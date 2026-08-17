# Trial banner tests need two weeks of real time

## Problem Description

The dashboard shows a trial banner in three states. Nothing early in the trial;
a warning during the final three days; an expired panel once the trial is over.
The banner is decided when the page loads, by comparing the `trialEndsAt`
timestamp that `GET /api/me` returns against the browser's own clock. The same
page starts an inactivity timer when it loads and signs the user out fifteen
minutes later unless the user does something.

The warning and expired cases are skipped. To run them you have to seed an
account with a trial that started eleven or fifteen days ago, using a script we
run by hand, and the two seeds overwrite each other, so the two tests can never
both pass in the same run. In practice nobody runs them and both states have
shipped broken before.

The inactivity test is not skipped, but it waits fifteen real minutes, so we
excluded the whole file from CI. And the first test only passes because
whichever account is seeded happens to be early in its trial - it would start
failing on its own, in about a week, without anyone touching the code.

We want the whole file to run on every pull request, finish in seconds, and give
the same answer whatever day of the year it runs on.

## Output Specification

Rework `cypress/e2e/trial.cy.ts` so that:

1. All four cases run, unskipped, in a single run, with no manual seeding step
   and no dependency on which account the environment happens to hold.
2. The three banner states are reached without any real time passing and
   without any test waiting.
3. The inactivity sign-out is exercised in full - the fifteen minute timeout
   must actually elapse from the application's point of view - in a test that
   finishes in seconds.
4. Every case gives the same result whether it runs today, in three months or
   on 29 February.
5. No fixed pauses.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/trial.cy.ts ===============
describe('Trial banner and idle sign-out', () => {
  it('shows no banner early in the trial', () => {
    cy.visit('/dashboard');
    cy.findByTestId('trial-banner').should('not.exist');
  });

  it.skip('warns during the final three days', () => {
    // needs an account whose 14 day trial started 11 days ago:
    // run `npm run seed:trial -- --age 11` by hand, then drop the skip
    cy.visit('/dashboard');
    cy.findByTestId('trial-banner').should('contain.text', '3 days left');
  });

  it.skip('shows the expired panel once the trial is over', () => {
    // same script with --age 15, which overwrites the seed above
    cy.visit('/dashboard');
    cy.findByTestId('trial-expired').should('be.visible');
  });

  it('signs the user out after fifteen minutes of inactivity', () => {
    cy.visit('/dashboard');
    cy.wait(900000);
    cy.findByText(/your session expired/i).should('be.visible');
  });
});

=============== FILE: cypress/support/commands.ts ===============
import '@testing-library/cypress/add-commands';

=============== FILE: cypress/support/e2e.ts ===============
import './commands';

=============== FILE: cypress.config.ts ===============
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    defaultCommandTimeout: 4000,
  },
});

=============== FILE: package.json ===============
{
  "name": "storefront-e2e",
  "private": true,
  "scripts": {
    "e2e": "cypress run",
    "seed:trial": "node scripts/seed-trial.js"
  },
  "devDependencies": {
    "@testing-library/cypress": "^10.0.2",
    "cypress": "^13.15.0"
  }
}
