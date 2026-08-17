# Every computed expectation comes out undefined or NaN

## Problem Description

`cypress/e2e/quote.cy.ts` checks arithmetic the page does: a line total is the
unit price times the quantity, the grand total is the sum of the row subtotals
minus a volume discount, and the PDF link must carry the quote number that is
printed at the top of the page.

None of the three tests can be made to pass. The first fails comparing against
`$NaN`. The third fails comparing against `$NaN` as well. The second fails
comparing the href against `/quotes/undefined.pdf`. If you print the value that
was read off the page it is always correct when it is read, and always missing
by the time the expectation is built.

Three people have tried to fix this. One added a one-second pause before the
comparison, which changed nothing. One rewrote the second test with `await` on
the line that reads the quote number, which also changed nothing and is still
in the file. One proposed dropping the computed expectations and hard-coding
`$29.97` and `Q-1001`, which we do not want - the point of these tests is that
the page's own numbers agree with each other, on any quote.

The values on screen are correct; the page is not the problem.

## Output Specification

Rework `cypress/e2e/quote.cy.ts` so all three tests pass and still compute their
expected values from what the page displays:

1. Each expectation must be derived from the value that was read off the page,
   not hard-coded and not read from a second source.
2. No expectation may be built from a value that has not been produced yet.
3. The comparison against the page must remain one that tolerates the total
   re-rendering a moment later on a slow runner.
4. The three behaviours stay: line total, PDF link, grand total with discount.
5. No fixed pauses.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/quote.cy.ts ===============
const money = (n: number) => `$${n.toFixed(2)}`;

describe('Quote totals', () => {
  beforeEach(() => {
    cy.visit('/quotes/Q-1001');
  });

  it('multiplies the unit price by the quantity', () => {
    let unitPrice: number;

    cy.findByTestId('unit-price')
      .invoke('text')
      .then((text) => {
        unitPrice = Number(text.replace('$', ''));
      });

    cy.findByLabelText('Quantity').clear().type('3');

    cy.findByTestId('line-total').should('have.text', money(unitPrice * 3));
  });

  it('carries the quote number into the PDF link', async () => {
    const quoteNumber = await cy.findByTestId('quote-number').invoke('text');

    cy.findByRole('link', { name: /download pdf/i }).should(
      'have.attr',
      'href',
      `/quotes/${quoteNumber}.pdf`,
    );
  });

  it('applies the ten percent volume discount', () => {
    let subtotal = 0;

    cy.get('[data-testid="row-subtotal"]').each(($row) => {
      subtotal += Number($row.text().replace('$', ''));
    });

    cy.wait(1000);

    cy.findByTestId('grand-total').should('have.text', money(subtotal * 0.9));
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
