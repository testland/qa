describe('Cart', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('.login-form__email').type('user@example.com');
    cy.get('.login-form__password').type('test-password');
    cy.get('.login-form__submit').click();
    cy.wait(2000);
  });

  it('adds an item', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.wait(1500);
    cy.get('.cart-count').should('have.text', '1');
  });

  it('adds two different items', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.visit('/products/BOOK-002');
    cy.get('.add-to-cart').click();
    cy.wait(1500);
    cy.get('.cart-count').should('have.text', '2');
  });

  it('increments quantity for a repeated item', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.get('.add-to-cart').click();
    cy.wait(1500);
    cy.get('.cart-count').should('have.text', '2');
  });

  it('removes an item', () => {
    cy.visit('/products/BOOK-001');
    cy.get('.add-to-cart').click();
    cy.visit('/cart');
    cy.get('.cart-row__remove').click();
    cy.wait(1500);
    cy.get('.cart-empty-message').should('be.visible');
  });
});
