# Cart suite is slow and flakes

## Problem Description

`cypress/e2e/cart.cy.ts` has four tests and every one of them drives the full
login form from scratch before doing anything else. The login flow is about six
seconds, so the file spends most of its runtime logging in.

It also flakes roughly one run in five on CI. The failures are always on the
cart-count assertions, and the author's response was to add sleeps before them,
which reduced the flake rate without removing it.

Selectors are pinned to CSS classes, which broke twice already when the design
system changed.

## Output Specification

Rework `cypress/e2e/cart.cy.ts` and add whatever support files it needs so that:

1. The login flow is executed once for the file rather than once per test, and
   the four tests still each start from a logged-in state that is not polluted
   by the previous test.
2. The sleeps are gone and the cart-count assertions are reliable on a slow
   runner.
3. Selectors survive a CSS refactor.

`cypress/e2e/search.cy.ts` is out of scope - leave it as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/cart.cy.ts ===============
describe('Cart', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('.login-form__email').type('user@example.com');
    cy.get('.login-form__password').type('test-password');
    cy.get('.login-form__submit').click();
    cy.wait(2000);
  });

  it('adds an item', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.wait(1500);
    cy.get('.cart-count').should('have.text', '1');
  });

  it('adds two different items', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.visit('/products/BOOK-002');
    cy.get('.add-to-cart').click();
    cy.wait(1500);
    cy.get('.cart-count').should('have.text', '2');
  });

  it('increments quantity for a repeated item', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.get('.add-to-cart').click();
    cy.wait(1500);
    cy.get('.cart-count').should('have.text', '2');
  });

  it('removes an item', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.visit('/cart');
    cy.get('.cart-row__remove').click();
    cy.wait(1500);
    cy.get('.cart-empty-message').should('be.visible');
  });
});

=============== FILE: cypress/e2e/search.cy.ts ===============
describe('Search', () => {
  it('finds a book by title', () => {
    cy.visit('/');
    cy.findByRole('searchbox', { name: /search/i }).type('Dune{enter}');
    cy.findByRole('heading', { name: /Dune/i }).should('be.visible');
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
