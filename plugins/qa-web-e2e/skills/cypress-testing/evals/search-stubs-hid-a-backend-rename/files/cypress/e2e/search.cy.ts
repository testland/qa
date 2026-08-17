describe('Search', () => {
  beforeEach(() => {
    cy.visit('/search');
  });

  it('lists matching books', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 200,
      body: {
        results: [
          { id: 'BOOK-001', title: 'Dune', author: 'Frank Herbert' },
          { id: 'BOOK-002', title: 'Dune Messiah', author: 'Frank Herbert' },
        ],
        total: 2,
      },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('dune');
    cy.findAllByRole('article').should('have.length', 2);
    cy.findByText('Dune Messiah').should('be.visible');
  });

  it('shows the author facet counts', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 200,
      body: {
        results: [
          { id: 'BOOK-001', title: 'Dune', author: 'Frank Herbert' },
          { id: 'BOOK-002', title: 'Dune Messiah', author: 'Frank Herbert' },
        ],
        facets: { author: [{ value: 'Frank Herbert', count: 2 }] },
        total: 2,
      },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('dune');
    cy.findByTestId('facet-author').should('contain.text', 'Frank Herbert (2)');
  });

  it('shows the empty state', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 200,
      body: { results: [], total: 0 },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('qqqq');
    cy.findByText(/no books matched/i).should('be.visible');
  });

  it('shows the error state', () => {
    cy.intercept('GET', '/api/search*', {
      statusCode: 500,
      body: { message: 'search unavailable' },
    });

    cy.findByRole('searchbox', { name: /search/i }).type('dune');
    cy.findByRole('alert').should('contain.text', 'try again');
  });
});
