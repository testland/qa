describe('Smoke', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.findByRole('heading', { name: /welcome/i }).should('be.visible');
  });
});
