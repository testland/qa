describe('billing', () => {
  it('shows the prorated amount on upgrade', () => {
    cy.visit('/billing/upgrade');
    cy.contains('button', 'Upgrade to Team').click();
    cy.get('[data-testid=prorated-amount]').should('have.text', '20.00');
  });

  it('shows the refund on cancel', () => {
    cy.visit('/billing/cancel');
    cy.contains('button', 'Cancel plan').click();
    cy.get('[data-testid=refund-amount]').should('have.text', '10.00');
  });
});
