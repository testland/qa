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
