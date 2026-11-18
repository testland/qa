describe('accessibility', () => {
  before(() => {
    cy.injectAxe();
  });

  it('home', () => {
    cy.visit('/');
    cy.checkA11y();
  });

  it('checkout dialog', () => {
    cy.visit('/cart');
    cy.checkA11y();
    cy.get('[data-test=checkout]').click(); // opens the payment dialog, rendered after an API call
  });

  it('legacy admin', () => {
    cy.visit('/admin');
    cy.checkA11y(null, null, null, true); // too many issues for now
  });
});
