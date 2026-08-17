# Orders spec only passes in file order

## Problem Description

`cypress/e2e/orders.cy.ts` passes when the whole file runs top to bottom and
fails the moment anything changes that order. Running a single test with
`--spec` and `.only`, or letting the runner retry just the failing one, gives
errors about an undefined order id.

The tests hand state to each other through a variable declared at the top of
the file: the first test creates an order and stores its id, and the later
tests read it. That also means the three later tests are not really testing
what their names say - they depend on the first one having succeeded.

We want each test to stand on its own so we can run, retry, or parallelise any
one of them.

## Output Specification

Rework `cypress/e2e/orders.cy.ts` so every test can run alone and in any order:

1. No test may depend on a value produced by another test.
2. Each test must arrange the order it needs, and that arrangement should not
   go through the checkout UI when the test is not about checkout - the API is
   available at `POST /api/orders` and returns the created order as JSON.
3. Keep the four behaviours under test: the order appears in history, it can be
   cancelled, a delivered order cannot be cancelled, and the invoice downloads.

`cypress/support/commands.ts` may gain helpers.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/orders.cy.ts ===============
let createdOrderId;

describe('Orders', () => {
  before(() => {
    cy.visit('/login');
    cy.findByLabelText('Email').type('user@example.com');
    cy.findByLabelText('Password').type('test-password');
    cy.findByRole('button', { name: /sign in/i }).click();
  });

  it('creates an order through checkout', () => {
    cy.visit('/products/BOOK-001');
    cy.findByRole('button', { name: /add to cart/i }).click();
    cy.visit('/checkout');
    cy.findByLabelText('Card number').type('4242424242424242');
    cy.findByRole('button', { name: /place order/i }).click();
    cy.findByTestId('order-id')
      .invoke('text')
      .then((text) => {
        createdOrderId = text.trim();
      });
  });

  it('shows the order in history', () => {
    cy.visit('/account/orders');
    cy.findByText(createdOrderId).should('be.visible');
  });

  it('cancels the order', () => {
    cy.visit(`/account/orders/${createdOrderId}`);
    cy.findByRole('button', { name: /cancel order/i }).click();
    cy.findByText(/cancelled/i).should('be.visible');
  });

  it('refuses to cancel a delivered order', () => {
    cy.visit(`/account/orders/${createdOrderId}`);
    cy.findByRole('button', { name: /cancel order/i }).should('be.disabled');
  });

  it('downloads the invoice', () => {
    cy.visit(`/account/orders/${createdOrderId}`);
    cy.findByRole('link', { name: /invoice/i }).should('have.attr', 'href');
  });
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
