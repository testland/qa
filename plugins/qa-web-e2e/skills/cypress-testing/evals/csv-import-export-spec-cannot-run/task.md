# Import test lies, export test will not even load

## Problem Description

`cypress/e2e/contacts.cy.ts` covers the CSV import and export on the contacts
page. Neither half works.

The import test builds a file object by hand, assigns it onto the input element
and fires an event at it. The application's upload component never reacts - the
list stays empty - so the test fails, and when someone "fixed" it by asserting
on the input's value instead, it passed while importing nothing.

The export test does not run at all. The spec fails to load with `Module not
found: fs`, because the file reads the downloaded CSV with Node's file system
module and parses it with the `csv-parse` package. Those imports sit at the top
of the spec, so the whole file is dead. Before it broke, the same test also sat
for five seconds after clicking Export, on the theory that the download would be
finished by then.

Two more cases are written as empty skipped tests: importing by dropping a file
onto the drop zone, which nobody worked out how to trigger, and starting from an
empty download directory, which we currently do by deleting
`cypress/downloads` by hand before running the file.

## Output Specification

Rework `cypress/e2e/contacts.cy.ts`, and change `cypress.config.ts` as needed, so
that:

1. The import test hands the file to the upload control the way a browser does,
   so the application's own upload handling runs. The CSV body must live in a
   reusable test data file rather than inline in the spec.
2. The drop-zone case is implemented against the drop zone, not against the
   file input.
3. The export test verifies the contents of the file that was actually
   downloaded - three rows, with `ada@example.com` in the first - and cannot
   fail because the download had not landed yet. It must not pause for a fixed
   time.
4. No spec file may import a Node module. Work that genuinely cannot happen in
   the browser - parsing the CSV with `csv-parse`, emptying the download
   directory - must run where it can, and be invoked from the test.
5. The download location is stated in configuration rather than assumed.
6. All four cases are live; no test may remain skipped.

## Input Files

Extract the following files before beginning.

=============== FILE: cypress/e2e/contacts.cy.ts ===============
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

=============== FILE: cypress.config.ts ===============
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    setupNodeEvents(on, config) {
      return config;
    },
  },
});

=============== FILE: cypress/support/commands.ts ===============
import '@testing-library/cypress/add-commands';

=============== FILE: cypress/support/e2e.ts ===============
import './commands';

=============== FILE: package.json ===============
{
  "name": "storefront-e2e",
  "private": true,
  "scripts": {
    "e2e": "cypress run"
  },
  "devDependencies": {
    "@testing-library/cypress": "^10.0.2",
    "csv-parse": "^5.5.6",
    "cypress": "^13.15.0"
  }
}
