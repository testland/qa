# Search suite stayed green through a breaking API change

## Problem Description

Three weeks ago the search service renamed the `results` array in its response
to `items`, and changed `facets.author` from an array of `{ value, count }`
objects into an object keyed by author name. Search on production rendered an
empty page for two days before a customer told us.

Every test in `cypress/e2e/search.cy.ts` passed the whole time, on every commit,
including the commit that shipped the break. The four tests each hand the
front end a response body written out by the test author, so the front end was
being fed the old shape long after the service stopped producing it.

We also have no idea whether the app sends what the service expects. There was
a bug last quarter where the page size went out as `per_page` instead of
`limit` and the service silently defaulted to 10 results; nothing in the suite
noticed. And the search box is debounced - a regression once made it fire one
request per keystroke, which we found from the service's rate-limit alerts, not
from a test.

The empty-results and server-error cases are different: the real service will
not produce them on demand, so those two tests do need a canned response. What
we object to is that the bodies are typed into the spec file, so nobody reviews
them and they drift.

## Output Specification

Rework `cypress/e2e/search.cy.ts` and add whatever supporting files it needs:

1. The two tests that describe what the real service returns - the results list
   and the author facet counts - must exercise the real endpoint, so that a
   change to the response shape fails the test instead of passing it.
2. The suite must assert what the app actually sends for a search of `dune`:
   the search term and a page size of 20, in the parameter names the service
   expects.
3. The suite must fail if typing one word produces more than one request to the
   search endpoint.
4. The empty-results and server-error tests keep their canned responses, but
   those bodies must live outside the spec file so they can be shared and
   reviewed.
5. No fixed pauses anywhere.
6. Keep all four behaviours under test.

`cypress/e2e/checkout.cy.ts` is out of scope - do not change it.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/search.cy.ts ===============
describe('Search', () => {
  beforeEach(() => {
    cy.visit('/search');
  });

  it('lists matching books', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 200,
      body: {
        results: [
          { id: 'BOOK-001', title: 'Dune', author: 'Frank Herbert' },
          { id: 'BOOK-002', title: 'Dune Messiah', author: 'Frank Herbert' },
        ],
        total: 2,
      },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('dune');
    cy.findAllByRole('article').should('have.length', 2);
    cy.findByText('Dune Messiah').should('be.visible');
  });

  it('shows the author facet counts', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 200,
      body: {
        results: [
          { id: 'BOOK-001', title: 'Dune', author: 'Frank Herbert' },
          { id: 'BOOK-002', title: 'Dune Messiah', author: 'Frank Herbert' },
        ],
        facets: { author: [{ value: 'Frank Herbert', count: 2 }] },
        total: 2,
      },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('dune');
    cy.findByTestId('facet-author').should('contain.text', 'Frank Herbert (2)');
  });

  it('shows the empty state', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 200,
      body: { results: [], total: 0 },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('qqqq');
    cy.findByText(/no books matched/i).should('be.visible');
  });

  it('shows the error state', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 500,
      body: { message: 'search unavailable' },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('dune');
    cy.findByRole('alert').should('contain.text', 'try again');
  });
});

=============== FILE: cypress/e2e/checkout.cy.ts ===============
describe('Checkout', () => {
  it('places an order', () => {
    cy.visit('/products/BOOK-001');
    cy.findByRole('button', { name: /add to cart/i }).click();
    cy.visit('/checkout');
    cy.findByLabelText('Card number').type('4242424242424242');
    cy.findByRole('button', { name: /place order/i }).click();
    cy.findByText(/order confirmed/i).should('be.visible');
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
