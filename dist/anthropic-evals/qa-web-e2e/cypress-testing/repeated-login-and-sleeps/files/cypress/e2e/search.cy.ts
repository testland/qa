describe('Search', () => {
  it('finds a book by title', () => {
    cy.visit('/');
    cy.findByRole('searchbox', { name: /search/i }).type('Dune{enter}');
    cy.findByRole('heading', { name: /Dune/i }).should('be.visible');
  });
});
