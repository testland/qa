describe('Checkout', () => {
  it('prices a dollar order with tax', () => {
    cy.visit('/products/BOOK-001');
    cy.findByRole('button', { name: /add to cart/i }).click();
    cy.visit('/checkout');
    cy.findByTestId('total').should('have.text', '$41.98');
  });
});
