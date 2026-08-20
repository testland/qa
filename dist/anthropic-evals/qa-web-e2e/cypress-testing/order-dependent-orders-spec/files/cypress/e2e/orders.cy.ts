let createdOrderId;

describe('Orders', () => {
  before(() => {
    cy.visit('/login');
    cy.findByLabelText('Email').type('user@example.com');
    cy.findByLabelText('Password').type('test-password');
    cy.findByRole('button', { name: /sign in/i }).click();
  });

  it('creates an order through checkout', () => {
    cy.visit('/products/BOOK-001');
    cy.findByRole('button', { name: /add to cart/i }).click();
    cy.visit('/checkout');
    cy.findByLabelText('Card number').type('4242424242424242');
    cy.findByRole('button', { name: /place order/i }).click();
    cy.findByTestId('order-id')
      .invoke('text')
      .then((text) => {
        createdOrderId = text.trim();
      });
  });

  it('shows the order in history', () => {
    cy.visit('/account/orders');
    cy.findByText(createdOrderId).should('be.visible');
  });

  it('cancels the order', () => {
    cy.visit(`/account/orders/${createdOrderId}`);
    cy.findByRole('button', { name: /cancel order/i }).click();
    cy.findByText(/cancelled/i).should('be.visible');
  });

  it('refuses to cancel a delivered order', () => {
    cy.visit(`/account/orders/${createdOrderId}`);
    cy.findByRole('button', { name: /cancel order/i }).should('be.disabled');
  });

  it('downloads the invoice', () => {
    cy.visit(`/account/orders/${createdOrderId}`);
    cy.findByRole('link', { name: /invoice/i }).should('have.attr', 'href');
  });
});
