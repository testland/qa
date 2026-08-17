# Checkout spec goes blind the moment we leave our own domain

## Problem Description

Login moved to our identity provider at `https://auth.example.com` and card
entry moved to a hosted payment page at `https://pay.example-psp.com`. Both are
separate sites; neither is under `example-books.com`, where the app runs.

Since that change the checkout spec cannot touch either page. Every command
issued after the redirect fails with a cross origin error, so the steps and the
assertions for both pages were commented out and never restored. What is left
navigates straight back to our own URLs and pretends the sign-in and the payment
happened, which means the spec no longer proves that a customer can pay, and the
last two production incidents on the payment page were both found by customers.

Two details matter. The identity provider must be given the address the test
generates for that run - each run signs in as a new address, so typing a
literal there is not an option, and the password comes from the environment,
never from the file. And CI runs this suite in both Chrome and Firefox; a fix
that only holds in one of them is not a fix, because the other job would keep
failing.

## Output Specification

Rework `cypress/e2e/checkout.cy.ts` so the whole purchase is exercised again:

1. On the identity provider page, the test types the generated address and the
   password from the environment, and asserts the tenant name `Acme Books` is
   shown before signing in.
2. On the hosted payment page, the test asserts the amount `$41.98` is shown,
   enters the card number, and confirms.
3. Back on our own site, the test asserts the order confirmation.
4. No commented-out coverage may remain.
5. The spec must behave identically under Chrome and Firefox; no
   browser-specific configuration.

`cypress.config.ts` may be changed if it needs to be.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/checkout.cy.ts ===============
const runEmail = `qa+${Date.now()}@example-books.com`;
const ssoPassword = Cypress.env('SSO_PASSWORD');

describe('Checkout', () => {
  it('signs in and pays for a book', () => {
    cy.visit('/products/BOOK-001');
    cy.findByRole('button', { name: /add to cart/i }).click();
    cy.visit('/checkout');
    cy.findByRole('button', { name: /sign in to continue/i }).click();

    // The click above lands on https://auth.example.com/login.
    // Everything below fails with a cross origin error, so it is commented out
    // and the identity provider page is no longer checked at all.
    //
    // cy.findByText('Acme Books').should('be.visible');
    // cy.findByLabelText('Work email').type(runEmail);
    // cy.findByLabelText('Password').type(ssoPassword);
    // cy.findByRole('button', { name: /continue/i }).click();

    cy.visit('/checkout/payment');
    cy.findByRole('button', { name: /pay now/i }).click();

    // The click above lands on https://pay.example-psp.com/session/...
    // Same problem, same treatment.
    //
    // cy.findByText('$41.98').should('be.visible');
    // cy.findByLabelText('Card number').type('4242424242424242');
    // cy.findByRole('button', { name: /confirm payment/i }).click();

    cy.findByText(/order confirmed/i).should('be.visible');
  });
});

=============== FILE: cypress.config.ts ===============
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://example-books.com',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    retries: { runMode: 2, openMode: 0 },
  },
});

=============== FILE: cypress/support/commands.ts ===============
import '@testing-library/cypress/add-commands';

=============== FILE: cypress/support/e2e.ts ===============
import './commands';

=============== FILE: package.json ===============
{
  "name": "storefront-e2e",
  "private": true,
  "scripts": {
    "e2e": "cypress run"
  },
  "devDependencies": {
    "@testing-library/cypress": "^10.0.2",
    "cypress": "^13.15.0"
  }
}
