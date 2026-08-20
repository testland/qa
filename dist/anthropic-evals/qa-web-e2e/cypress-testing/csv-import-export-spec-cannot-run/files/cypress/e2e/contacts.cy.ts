import fs from 'fs';
import { parse } from 'csv-parse/sync';

describe('Contacts import and export', () => {
  beforeEach(() => {
    cy.visit('/contacts');
  });

  it('imports contacts from a CSV', () => {
    const csv =
      'name,email\nAda Lovelace,ada@example.com\nGrace Hopper,grace@example.com\n';

    cy.get('input[type=file]').then(($input) => {
      const input = $input[0] as HTMLInputElement;
      const transfer = new DataTransfer();
      transfer.items.add(new File([csv], 'contacts.csv', { type: 'text/csv' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    });

    cy.findByText('Ada Lovelace').should('be.visible');
    cy.findByText('Grace Hopper').should('be.visible');
  });

  it.skip('imports contacts dropped onto the drop zone', () => {
    // the drop zone is [data-testid="contacts-dropzone"]; nobody worked out
    // how to make it see a file
  });

  it('exports the visible contacts', () => {
    cy.findByRole('button', { name: /export csv/i }).click();
    cy.wait(5000);

    const rows = parse(fs.readFileSync('cypress/downloads/contacts.csv'), {
      columns: true,
    });

    expect(rows).to.have.length(3);
    expect(rows[0].email).to.eq('ada@example.com');
  });

  it.skip('starts from an empty download directory', () => {
    // done by hand before each run
  });
});
