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
