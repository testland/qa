describe('admin roles', () => {
  beforeEach(() => {
    cy.request('POST', '/api/test/seed', { fixture: 'roles' });
    cy.visit('/roles');
  });

  it('an owner can invite a member', () => {
    cy.get('[data-cy=invite]').click();
    cy.get('[data-cy=email]').type('dana@acme.test');
    cy.get('[data-cy=send]').click();
    cy.contains('Invitation sent').should('be.visible');
  });

  it('a revoked member loses dashboard access', () => {
    cy.get('[data-cy=member-row-dana]').find('[data-cy=revoke]').click();
    cy.wait(4000);
    cy.get('[data-cy=member-row-dana]').should('not.exist');
  });
});
