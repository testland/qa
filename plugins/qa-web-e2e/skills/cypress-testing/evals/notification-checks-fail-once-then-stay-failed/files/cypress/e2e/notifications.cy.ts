describe('Notifications', () => {
  beforeEach(() => {
    cy.visit('/inbox');
  });

  it('drops the unread badge when a message is marked read', () => {
    cy.findByTestId('unread-badge').then(($badge) => {
      expect($badge.text()).to.eq('4');
    });

    cy.findAllByRole('listitem')
      .first()
      .findByRole('button', { name: /mark read/i })
      .click();

    cy.findByTestId('unread-badge', { timeout: 10000 }).then(($badge) => {
      expect($badge.text()).to.eq('3');
    });
  });

  it('closes the archive toast', () => {
    cy.findAllByRole('listitem')
      .first()
      .findByRole('button', { name: /archive/i })
      .click();

    cy.get('[data-testid="toast"]').should(($toast) => {
      expect($toast).to.contain.text('Archived');
      $toast.find('button.toast-close').trigger('click');
    });

    cy.get('[data-testid="toast"]').should('not.exist');
  });

  it('shows no error toast when the draft saves', () => {
    cy.findByRole('button', { name: /save draft/i }).click();
    cy.get('[data-testid="error-toast"]').should('not.exist');
  });
});
