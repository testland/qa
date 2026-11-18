# Fix our cypress-axe accessibility test

## Problem Description

Fix `cypress/e2e/a11y.cy.js` (cypress-axe) for the problems in `notes.md`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: cypress/e2e/a11y.cy.js ===============
describe('accessibility', () => {
  before(() => {
    cy.injectAxe();
  });

  it('home', () => {
    cy.visit('/');
    cy.checkA11y();
  });

  it('checkout dialog', () => {
    cy.visit('/cart');
    cy.checkA11y();
    cy.get('[data-test=checkout]').click(); // opens the payment dialog, rendered after an API call
  });

  it('legacy admin', () => {
    cy.visit('/admin');
    cy.checkA11y(null, null, null, true); // too many issues for now
  });
});

=============== FILE: notes.md ===============
- The tests fail with "axe is not defined" or pass on pages we know are broken.
- The payment dialog has an unlabeled card-number field and no test ever reported it.
- In CI, failures only say "3 accessibility violations were detected", with no rule or element.
- Admin has about 200 minor and moderate issues; we want critical and serious ones to block now
  and the rest to be fixed later.
