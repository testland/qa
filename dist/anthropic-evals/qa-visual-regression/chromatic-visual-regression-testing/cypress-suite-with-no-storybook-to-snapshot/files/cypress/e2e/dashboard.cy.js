describe('dashboard', () => {
  beforeEach(() => {
    cy.login('finance-lead@acme.test');
  });

  it('shows how fresh the figures are', () => {
    cy.visit('/dashboard');
    cy.contains(/Updated \d+ minutes? ago/).should('be.visible');
    cy.screenshot('dashboard', { capture: 'viewport' });
  });

  it('links through to overdue invoices', () => {
    cy.visit('/dashboard');
    cy.findByRole('link', { name: /overdue/i }).click();
    cy.location('pathname').should('eq', '/invoices');
  });

  it('renders the rolling 24 hour volume chart', () => {
    cy.visit('/dashboard');
    cy.findByTestId('volume-sparkline').should('exist');
    cy.findByTestId('open-invoice-count').should('not.have.text', '');
  });
});
