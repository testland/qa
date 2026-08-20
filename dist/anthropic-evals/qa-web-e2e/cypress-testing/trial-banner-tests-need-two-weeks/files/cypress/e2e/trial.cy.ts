describe('Trial banner and idle sign-out', () => {
  it('shows no banner early in the trial', () => {
    cy.visit('/dashboard');
    cy.findByTestId('trial-banner').should('not.exist');
  });

  it.skip('warns during the final three days', () => {
    // needs an account whose 14 day trial started 11 days ago:
    // run `npm run seed:trial -- --age 11` by hand, then drop the skip
    cy.visit('/dashboard');
    cy.findByTestId('trial-banner').should('contain.text', '3 days left');
  });

  it.skip('shows the expired panel once the trial is over', () => {
    // same script with --age 15, which overwrites the seed above
    cy.visit('/dashboard');
    cy.findByTestId('trial-expired').should('be.visible');
  });

  it('signs the user out after fifteen minutes of inactivity', () => {
    cy.visit('/dashboard');
    cy.wait(900000);
    cy.findByText(/your session expired/i).should('be.visible');
  });
});
