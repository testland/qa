describe('login', () => {
  it('renders the sign-in form', () => {
    cy.visit('/login');
    cy.findByRole('heading', { name: 'Sign in' }).should('be.visible');
    cy.findByLabelText('Work email').should('be.enabled');
    cy.findByRole('button', { name: 'Continue' }).should('be.enabled');
    cy.screenshot('login', { capture: 'viewport' });
    cy.readFile('cypress/screenshots/login.cy.js/login.png', 'base64').then((image) => {
      cy.task('visual:compare', { name: 'login', image });
    });
  });

  it('rejects an unknown address', () => {
    cy.visit('/login');
    cy.findByLabelText('Work email').type('nobody@example.com');
    cy.findByRole('button', { name: 'Continue' }).click();
    cy.findByRole('alert').should('contain.text', 'We do not recognise that address');
  });
});
