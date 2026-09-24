describe('invoice detail', () => {
  beforeEach(() => {
    cy.task('db:seed', 'invoice-fixture');
    cy.login('finance-lead@acme.test');
  });

  it('renders the invoice header and totals', () => {
    cy.visit('/invoices/INV-1042');
    cy.findByRole('heading', { name: 'INV-1042' }).should('be.visible');
    cy.findByTestId('invoice-total').should('have.text', '€1,042.99');
    cy.screenshot('invoice', { capture: 'viewport' });
    cy.readFile('cypress/screenshots/invoice.cy.js/invoice.png', 'base64').then((image) => {
      cy.task('visual:compare', { name: 'invoice', image });
    });
  });
});
